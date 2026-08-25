import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Core user table backing the Manus OAuth flow. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const orderStatuses = ["confirmation_pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export const sheetSyncStates = ["pending", "synced", "failed"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type SheetSyncState = (typeof sheetSyncStates)[number];

/** Persistent customer order records. The database is the source of truth; Sheets is a synchronized mirror. */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("orderId", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  address: text("address").notNull(),
  deliveryLocation: varchar("deliveryLocation", { length: 16 }).$type<"dhaka" | "outside">().notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  paymentMethod: varchar("paymentMethod", { length: 16 }).$type<"cod" | "bkash">().notNull(),
  bkashNumber: varchar("bkashNumber", { length: 32 }),
  transactionId: varchar("transactionId", { length: 128 }),
  bookPrice: integer("bookPrice").notNull(),
  deliveryCharge: integer("deliveryCharge").notNull(),
  total: integer("total").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).$type<OrderStatus>().default("confirmation_pending").notNull(),
  sheetSyncState: varchar("sheetSyncState", { length: 16 }).$type<SheetSyncState>().default("pending").notNull(),
  sheetSyncError: text("sheetSyncError"),
  sheetSyncedAt: timestamp("sheetSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;