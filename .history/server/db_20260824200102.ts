import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { InsertOrder, InsertUser, OrderStatus, SheetSyncState, orders, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createLocalOrderStore } from "./localOrderStore";

let _db: ReturnType<typeof drizzle> | null = null;
const localOrders = createLocalOrderStore();

export function isLocalOrderStoreEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.CURIO_FORCE_LOCAL_STORE === "1") return true;
  if (!env.DATABASE_URL) return true;
  if (env.CURIO_USE_REMOTE_DATABASE === "1") return false;

  const hasHostedRuntime = Boolean(env.BUILT_IN_FORGE_API_URL || (env.VITE_APP_ID && env.OAUTH_SERVER_URL));
  return env.NODE_ENV !== "production" && !hasHostedRuntime;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
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
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
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
  await db.insert(orders).values(values);
  const result = await db.select().from(orders).where(eq(orders.orderId, values.orderId)).limit(1);
  if (!result[0]) throw new Error("Order could not be created.");
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