import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { orderStatuses } from "../drizzle/schema.js";
import { createOrder, deleteOrderById, getOrderById, isLocalOrderStoreEnabled, listOrders, updateOrderStatus, updateOrdersStatus, updateSheetSyncState } from "./db.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { CREDENTIAL_ADMIN_OPEN_ID, CREDENTIAL_ADMIN_SESSION_MS, isCredentialAdminConfigured, verifyCredentialAdminLogin } from "./adminCredentials.js";
import { sdk } from "./_core/sdk.js";
import { adminProcedure, publicProcedure, router } from "./_core/trpc.js";
import { deleteOrderFromGoogleSheet, getGoogleSheetsSyncStatus, hasGoogleSheetsConfigurationAttempt, isGoogleSheetsSyncEnabled, syncOrderToGoogleSheet, verifyGoogleSheetsConnection } from "./googleSheets.js";
import { calculateOrderTotals, statusLabel } from "./orderConstants.js";
import { systemRouter } from "./_core/systemRouter.js";
import { sendOrderPlacedEmail, sendOrderDeliveredEmail } from "./mailer.js";

// Ultra-permissive input schema to prevent HTTP 400 validation failures during launch
export const orderInput = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(160),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[^\d]/g, "")) // Strips spaces, dashes, and non-digits
    .pipe(z.string().min(10, "Invalid phone number").max(15)),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((val) => {
      if (!val || !val.includes("@")) return "customer@curio.bd";
      return val;
    }),
  address: z.string().trim().min(2, "Address is required"),
  location: z.enum(["dhaka", "outside"]),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  payment: z.enum(["cod", "bkash"]),
  bkashNumber: z.string().trim().max(32).optional().or(z.literal("")),
  transactionId: z.string().trim().max(128).optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.payment === "bkash" && (!value.transactionId || value.transactionId.trim() === "")) {
    context.addIssue({ 
      code: z.ZodIssueCode.custom, 
      path: ["transactionId"], 
      message: "A bKash transaction ID is required." 
    });
  }
});

function normalizeBangladeshPhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.startsWith("1")) return `0${digits}`;
  return digits;
}

const adminCredentialInput = z
  .object({
    id: z.string().trim().optional(),
    loginId: z.string().trim().optional(),
    username: z.string().trim().optional(),
    password: z.string().min(1).max(512),
  })
  .transform((data) => ({
    id: (data.id || data.loginId || data.username || "").trim(),
    password: data.password,
  }))
  .refine((data) => data.id.length > 0, {
    message: "Administrator login ID or username is required.",
  });

const credentialAttempts = new Map<string, { attempts: number; resetAt: number }>();
const MAX_CREDENTIAL_ATTEMPTS = 5;
const CREDENTIAL_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function credentialAttemptKey(request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0];
  return forwardedIp?.trim() || request.ip || "unknown";
}

function recordCredentialFailure(key: string) {
  const now = Date.now();
  const existing = credentialAttempts.get(key);
  const current = !existing || existing.resetAt <= now ? { attempts: 0, resetAt: now + CREDENTIAL_ATTEMPT_WINDOW_MS } : existing;
  current.attempts += 1;
  credentialAttempts.set(key, current);
}

function credentialLoginIsRateLimited(key: string) {
  const record = credentialAttempts.get(key);
  if (!record) return false;
  if (record.resetAt <= Date.now()) {
    credentialAttempts.delete(key);
    return false;
  }
  return record.attempts >= MAX_CREDENTIAL_ATTEMPTS;
}

async function mirrorOrder(orderId: string) {
  const sheetsStatus = getGoogleSheetsSyncStatus();
  if (isLocalOrderStoreEnabled() && !sheetsStatus.enabled) {
    if (hasGoogleSheetsConfigurationAttempt()) {
      await updateSheetSyncState(orderId, "failed", sheetsStatus.message ?? "Google Sheets sync is not configured.");
    }
    return;
  }

  const order = await getOrderById(orderId);
  if (!order) return;
  try {
    await syncOrderToGoogleSheet(order);
    await updateSheetSyncState(orderId, "synced");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1500) : "Unknown Sheets synchronization error.";
    console.error(`[Sheets] Failed to sync ${orderId}`, error);
    await updateSheetSyncState(orderId, "failed", message);
  }
}

async function deleteOrderWithSheet(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });

  let sheetRowRemoved = false;

  if (isGoogleSheetsSyncEnabled()) {
    try {
      sheetRowRemoved = await deleteOrderFromGoogleSheet(order.orderId);
    } catch (error) {
      console.warn(`[Sheets] Could not remove row for ${order.orderId} from sheet:`, error);
    }
  }

  await deleteOrderById(order.orderId);
  return { orderId: order.orderId, sheetRowRemoved };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    adminCredentialConfiguration: publicProcedure.query(async () => ({ configured: await isCredentialAdminConfigured() })),
    adminCredentialLogin: publicProcedure.input(adminCredentialInput).mutation(async ({ ctx, input }) => {
      const attemptKey = credentialAttemptKey(ctx.req);
      if (credentialLoginIsRateLimited(attemptKey) || !(await verifyCredentialAdminLogin(input.id, input.password))) {
        recordCredentialFailure(attemptKey);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid administrator credentials." });
      }
      credentialAttempts.delete(attemptKey);
      const token = await sdk.createSessionToken(CREDENTIAL_ADMIN_OPEN_ID, { name: "Curio Admin", expiresInMs: CREDENTIAL_ADMIN_SESSION_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: CREDENTIAL_ADMIN_SESSION_MS });
      return { success: true, token } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    create: publicProcedure.input(orderInput).mutation(async ({ input }) => {
      const { bookPrice, deliveryCharge, total } = calculateOrderTotals(input.location, input.quantity);
      const order = await createOrder({
        orderId: `CURIO-${nanoid(8).toUpperCase()}`,
        fullName: input.fullName,
        phone: normalizeBangladeshPhone(input.phone),
        email: input.email || "customer@curio.bd",
        address: input.address,
        deliveryLocation: input.location,
        quantity: input.quantity,
        note: input.note || null,
        paymentMethod: input.payment,
        bkashNumber: input.payment === "bkash" ? input.bkashNumber || null : null,
        transactionId: input.payment === "bkash" ? input.transactionId || null : null,
        bookPrice,
        deliveryCharge,
        total,
        paymentStatus: input.payment === "cod" ? "Payment on delivery" : "Awaiting verification",
        status: "confirmation_pending",
      });

      // Background non-blocking Google Sheets synchronization
      mirrorOrder(order.orderId).catch((err) => {
        console.error(`[Background Sheets Sync Error] ${order.orderId}:`, err);
      });

      // Background non-blocking email delivery
      sendOrderPlacedEmail({
        orderId: order.orderId,
        trackingId: order.orderId,
        customerName: order.fullName,
        customerEmail: order.email,
        phone: order.phone,
        shippingAddress: order.address,
        totalAmount: order.total,
      }).catch((err) => {
        console.error(`[Background Mailer Error] ${order.orderId}:`, err);
      });

      const fetchedOrder = await getOrderById(order.orderId);
      return fetchedOrder ?? order;
    }),
    track: publicProcedure.input(z.object({ orderId: z.string().trim().min(4).max(32), phone: z.string().trim().min(8).max(32) })).query(async ({ input }) => {
      const order = await getOrderById(input.orderId.toUpperCase());
      if (!order || normalizeBangladeshPhone(order.phone) !== normalizeBangladeshPhone(input.phone)) return null;
      return {
        orderId: order.orderId,
        phone: order.phone,
        deliveryLocation: order.deliveryLocation,
        quantity: order.quantity,
        total: order.total,
        paymentStatus: order.paymentStatus,
        status: order.status,
        statusLabel: statusLabel(order.status),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    }),
    adminList: adminProcedure.query(async () => listOrders()),
    adminSheetSyncStatus: adminProcedure.query(() => getGoogleSheetsSyncStatus()),
    adminCheckSheetConnection: adminProcedure.mutation(async () => {
      await verifyGoogleSheetsConnection();
      return { connected: true } as const;
    }),
    adminUpdateStatus: adminProcedure.input(z.object({ orderId: z.string().trim().min(4).max(32), status: z.enum(orderStatuses) })).mutation(async ({ input }) => {
      const previousOrder = await getOrderById(input.orderId);
      const updated = await updateOrderStatus(input.orderId, input.status);
      
      mirrorOrder(updated.orderId).catch((err) => console.error(`[Sheets Error] ${updated.orderId}:`, err));

      if (input.status === "delivered" && previousOrder?.status !== "delivered") {
        sendOrderDeliveredEmail({
          orderId: updated.orderId,
          trackingId: updated.orderId,
          customerName: updated.fullName,
          customerEmail: updated.email,
          phone: updated.phone,
          shippingAddress: updated.address,
        }).catch((err) => console.error(`[Mailer Error] ${updated.orderId}:`, err));
      }

      return (await getOrderById(updated.orderId))!;
    }),
    adminBulkUpdateStatus: adminProcedure.input(z.object({ orderIds: z.array(z.string().trim().min(4).max(32)).min(1).max(100), status: z.enum(orderStatuses) })).mutation(async ({ input }) => {
      const orderIds = Array.from(new Set(input.orderIds.map(orderId => orderId.toUpperCase())));
      const existing = await Promise.all(orderIds.map(getOrderById));
      if (existing.some(order => !order)) throw new TRPCError({ code: "NOT_FOUND", message: "One or more selected orders no longer exist." });
      
      const updated = await updateOrdersStatus(orderIds, input.status);

      for (const order of updated) {
        mirrorOrder(order.orderId).catch((err) => console.error(`[Sheets Error] ${order.orderId}:`, err));

        const previousOrder = existing.find(e => e?.orderId === order.orderId);
        if (input.status === "delivered" && previousOrder?.status !== "delivered") {
          sendOrderDeliveredEmail({
            orderId: order.orderId,
            trackingId: order.orderId,
            customerName: order.fullName,
            customerEmail: order.email,
            phone: order.phone,
            shippingAddress: order.address,
          }).catch((err) => console.error(`[Mailer Error] ${order.orderId}:`, err));
        }
      }
      return Promise.all(orderIds.map(orderId => getOrderById(orderId)));
    }),
    adminRetrySheetSync: adminProcedure.input(z.object({ orderId: z.string().trim().min(4).max(32) })).mutation(async ({ input }) => {
      await mirrorOrder(input.orderId);
      const order = (await getOrderById(input.orderId))!;
      if (order.sheetSyncState === "failed") throw new TRPCError({ code: "BAD_REQUEST", message: order.sheetSyncError ?? "Google Sheets sync failed." });
      return order;
    }),
    adminDeleteOrder: adminProcedure.input(z.object({ orderId: z.string().trim().min(4).max(32) })).mutation(async ({ input }) => deleteOrderWithSheet(input.orderId.toUpperCase())),
    adminBulkDeleteOrders: adminProcedure.input(z.object({ orderIds: z.array(z.string().trim().min(4).max(32)).min(1).max(100) })).mutation(async ({ input }) => {
      const orderIds = Array.from(new Set(input.orderIds.map(orderId => orderId.toUpperCase())));
      const deleted = [] as Array<{ orderId: string; sheetRowRemoved: boolean }>;
      for (const orderId of orderIds) deleted.push(await deleteOrderWithSheet(orderId));
      return { deletedOrderIds: deleted.map(order => order.orderId), sheetRowsRemoved: deleted.filter(order => order.sheetRowRemoved).length };
    }),
  }),
});

export type AppRouter = typeof appRouter;