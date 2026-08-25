import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Core user records retained for hosted OAuth identities. */
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).notNull().defaultNow(),
});

/** Stores only a keyed login digest and a salted password hash for credential-admin access. */
export const credentialAdmins = pgTable("credential_admins", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  loginIdHash: varchar("loginIdHash", { length: 128 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatuses = ["confirmation_pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export const sheetSyncStates = ["pending", "synced", "failed"] as const;

/** PostgreSQL source-of-truth for customer order history. */
export const orders = pgTable("orders", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  orderId: varchar("orderId", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  address: text("address").notNull(),
  deliveryLocation: varchar("deliveryLocation", { length: 16 }).notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  paymentMethod: varchar("paymentMethod", { length: 16 }).notNull(),
  bkashNumber: varchar("bkashNumber", { length: 32 }),
  transactionId: varchar("transactionId", { length: 128 }),
  bookPrice: integer("bookPrice").notNull(),
  deliveryCharge: integer("deliveryCharge").notNull(),
  total: integer("total").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("confirmation_pending").$type<OrderStatus>(),
  sheetSyncState: varchar("sheetSyncState", { length: 16 }).notNull().default("pending").$type<SheetSyncState>(),
  sheetSyncError: text("sheetSyncError"),
  sheetSyncedAt: timestamp("sheetSyncedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CredentialAdmin = typeof credentialAdmins.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderStatus = (typeof orderStatuses)[number];
export type SheetSyncState = (typeof sheetSyncStates)[number];
