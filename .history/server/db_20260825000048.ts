import { and, desc, eq } from "drizzle-orm";
import { connect } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "../drizzle/schema.js";
import { InsertOrder, InsertUser, OrderStatus, SheetSyncState, orders, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";
import { createLocalOrderStore } from "./localOrderStore.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
const localOrders = createLocalOrderStore();

export function isLocalOrderStoreEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.CURIO_FORCE_LOCAL_STORE === "1") return true;
  if (!env.DATABASE_URL) return true;
  if (env.CURIO_USE_REMOTE_DATABASE === "1" || env.VERCEL || env.NODE_ENV === "production") {
    return false;
  }

  const hasHostedRuntime = Boolean(env.BUILT_IN_FORGE_API_URL || (env.VITE_APP_ID && env.OAUTH_SERVER_URL));
  return !hasHostedRuntime;
}

export async function getDb() {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("[Database] DATABASE_URL is missing in environment variables.");
      return null;
    }
    try {
      const client = connect({ url: dbUrl });
      _db = drizzle(client, { schema });
    } catch (error) {
      console.error("[Database] Failed to initialize TiDB Serverless client:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed. Please verify DATABASE_URL in Vercel Environment Variables.");
  }
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (isLocalOrderStoreEnabled()) return;
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  if (isLocalOrderStoreEnabled()) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createOrder(values: InsertOrder) {
  if (isLocalOrderStoreEnabled()) return localOrders.create(values);
  const db = await requireDb();

  // ONLY strip undefined (not null) so Drizzle uses `?` placeholders with null values instead of the `default` keyword
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([_, val]) => val !== undefined)
  ) as InsertOrder;

  await db.insert(orders).values(cleanValues);
  
  const result = await db.select().from(orders).where(eq(orders.orderId, values.orderId)).limit(1);
  if (!result[0]) throw new Error("Order could not be created in database.");
  return result[0];
}

export async function getOrderById(orderId: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.getById(orderId);
  const db = await requireDb();
  const result = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  return result[0];
}

export async function getOrderForTracking(orderId: string, phone: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.getForTracking(orderId, phone);
  const db = await requireDb();
  const result = await db.select().from(orders).where(and(eq(orders.orderId, orderId), eq(orders.phone, phone))).limit(1);
  return result[0];
}

export async function listOrders() {
  if (isLocalOrderStoreEnabled()) return localOrders.list();
  const db = await requireDb();
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (isLocalOrderStoreEnabled()) return localOrders.updateStatus(orderId, status);
  const db = await requireDb();
  await db.update(orders).set({ status, sheetSyncState: "pending", sheetSyncError: null }).where(eq(orders.orderId, orderId));
  const updated = await getOrderById(orderId);
  if (!updated) throw new Error("Order not found.");
  return updated;
}

export async function deleteOrderById(orderId: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.delete(orderId);
  const db = await requireDb();
  await db.delete(orders).where(eq(orders.orderId, orderId));
}

export async function updateSheetSyncState(orderId: string, state: SheetSyncState, error?: string | null) {
  if (isLocalOrderStoreEnabled()) return localOrders.updateSheetState(orderId, state, error);
  const db = await requireDb();
  await db.update(orders).set({ sheetSyncState: state, sheetSyncError: error ?? null, sheetSyncedAt: state === "synced" ? new Date() : null }).where(eq(orders.orderId, orderId));
  const updated = await getOrderById(orderId);
  if (!updated) throw new Error("Order not found.");
  return updated;
}