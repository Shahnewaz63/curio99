import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertOrder, InsertUser, OrderStatus, SheetSyncState, orders, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";
import { createLocalOrderStore } from "./localOrderStore.js";

type PostgresDb = ReturnType<typeof drizzle>;
const DATABASE_TIME_ZONE = "Asia/Dhaka";

let pool: Pool | null = null;
let db: PostgresDb | null = null;
const localOrders = createLocalOrderStore();

export function getNeonDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.NEON_DATABASE_URL || env.POSTGRES_DATABASE_URL || null;
}

export function getOrderHistoryRuntimeStatus(env: NodeJS.ProcessEnv = process.env) {
  const configured = Boolean(getNeonDatabaseUrl(env));
  return {
    provider: "neon" as const,
    configured,
    message: configured
      ? null
      : "Neon PostgreSQL is required. Add NEON_DATABASE_URL (or the legacy POSTGRES_DATABASE_URL) to .env.local, then restart pnpm dev.",
  };
}

export function isLocalOrderStoreEnabled(env: NodeJS.ProcessEnv = process.env) {
  // The JSON store remains only for isolated automated tests.
  // Production and VSCode orders always require the configured Neon PostgreSQL database.
  if (env.NODE_ENV === "test" || env.VITEST) return true;
  return false;
}

export async function getDb() {
  if (isLocalOrderStoreEnabled()) return null;
  const connectionString = getNeonDatabaseUrl();
  if (!db && connectionString) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 5 });
    pool.on("connect", client => { void client.query(`SET TIME ZONE '${DATABASE_TIME_ZONE}'`); });
    await pool.query(`SET TIME ZONE '${DATABASE_TIME_ZONE}'`);
    db = drizzle(pool);
  }
  return db;
}

async function requireDb() {
  const database = await getDb();
  if (!database) throw new Error(getOrderHistoryRuntimeStatus().message ?? "Neon PostgreSQL order history is unavailable.");
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (isLocalOrderStoreEnabled()) return;
  if (!user.openId) throw new Error("User openId is required for upsert");
  const database = await requireDb();
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn, updatedAt: new Date() };
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
  await database.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  if (isLocalOrderStoreEnabled()) return undefined;
  const database = await getDb();
  if (!database) return undefined;
  return (await database.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function createOrder(values: InsertOrder) {
  if (isLocalOrderStoreEnabled()) return localOrders.create(values);
  const created = await (await requireDb()).insert(orders).values(values).returning();
  if (!created[0]) throw new Error("Order could not be created.");
  return created[0];
}

export async function getOrderById(orderId: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.getById(orderId);
  return (await (await requireDb()).select().from(orders).where(eq(orders.orderId, orderId)).limit(1))[0];
}

export async function getOrderForTracking(orderId: string, phone: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.getForTracking(orderId, phone);
  return (await (await requireDb()).select().from(orders).where(and(eq(orders.orderId, orderId), eq(orders.phone, phone))).limit(1))[0];
}

export async function listOrders() {
  if (isLocalOrderStoreEnabled()) return localOrders.list();
  return (await requireDb()).select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (isLocalOrderStoreEnabled()) return localOrders.updateStatus(orderId, status);
  const database = await requireDb();
  await database.update(orders).set({ status, sheetSyncState: "pending", sheetSyncError: null, updatedAt: new Date() }).where(eq(orders.orderId, orderId));
  const updated = await getOrderById(orderId);
  if (!updated) throw new Error("Order not found.");
  return updated;
}

export async function updateOrdersStatus(orderIds: string[], status: OrderStatus) {
  if (isLocalOrderStoreEnabled()) return Promise.all(orderIds.map(orderId => localOrders.updateStatus(orderId, status)));
  const database = await requireDb();
  await database.update(orders).set({ status, sheetSyncState: "pending", sheetSyncError: null, updatedAt: new Date() }).where(inArray(orders.orderId, orderIds));
  return database.select().from(orders).where(inArray(orders.orderId, orderIds));
}

export async function deleteOrderById(orderId: string) {
  if (isLocalOrderStoreEnabled()) return localOrders.delete(orderId);
  await (await requireDb()).delete(orders).where(eq(orders.orderId, orderId));
}

export async function updateSheetSyncState(orderId: string, state: SheetSyncState, error?: string | null) {
  if (isLocalOrderStoreEnabled()) return localOrders.updateSheetState(orderId, state, error);
  const database = await requireDb();
  await database.update(orders).set({ sheetSyncState: state, sheetSyncError: error ?? null, sheetSyncedAt: state === "synced" ? new Date() : null, updatedAt: new Date() }).where(eq(orders.orderId, orderId));
  const updated = await getOrderById(orderId);
  if (!updated) throw new Error("Order not found.");
  return updated;
}
