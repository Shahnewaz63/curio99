import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const orderStatuses = ["confirmation_pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export const sheetSyncStates = ["pending", "synced", "failed"] as const;

/** Persistent customer order records. The database is the source of truth; Sheets is a synchronized mirror. */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  address: text("address").notNull(),
  deliveryLocation: mysqlEnum("deliveryLocation", ["dhaka", "outside"]).notNull(),
  quantity: int("quantity").notNull(),
  note: text("note"),
  paymentMethod: mysqlEnum("paymentMethod", ["cod", "bkash"]).notNull(),
  bkashNumber: varchar("bkashNumber", { length: 32 }),
  transactionId: varchar("transactionId", { length: 128 }),
  bookPrice: int("bookPrice").notNull(),
  deliveryCharge: int("deliveryCharge").notNull(),
  total: int("total").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 64 }).notNull(),
  status: mysqlEnum("status", orderStatuses).default("confirmation_pending").notNull(),
  sheetSyncState: mysqlEnum("sheetSyncState", sheetSyncStates).default("pending").notNull(),
  sheetSyncError: text("sheetSyncError"),
  sheetSyncedAt: timestamp("sheetSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderStatus = (typeof orderStatuses)[number];
export type SheetSyncState = (typeof sheetSyncStates)[number];
