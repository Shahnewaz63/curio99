import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { InsertOrder, Order, OrderStatus, SheetSyncState } from "../drizzle/schema.js";

type StoredOrder = Omit<Order, "createdAt" | "updatedAt" | "sheetSyncedAt"> & {
  createdAt: string;
  updatedAt: string;
  sheetSyncedAt: string | null;
};

function hydrateOrder(order: StoredOrder): Order {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    sheetSyncedAt: order.sheetSyncedAt ? new Date(order.sheetSyncedAt) : null,
  };
}

function serializeOrder(order: Order): StoredOrder {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    sheetSyncedAt: order.sheetSyncedAt?.toISOString() ?? null,
  };
}

function getDefaultFilePath() {
  // Use OS temporary directory (/tmp) on Vercel to allow writes on serverless
  const baseDir = process.env.VERCEL || process.env.NODE_ENV === "production"
    ? os.tmpdir()
    : process.cwd();
  return path.join(baseDir, ".curio-local-data", "orders.json");
}

export function createLocalOrderStore(filePath = getDefaultFilePath()) {
  const read = (): Order[] => {
    try {
      if (!fs.existsSync(filePath)) return [];
      const raw = fs.readFileSync(filePath, "utf8").trim();
      if (!raw) return [];
      return (JSON.parse(raw) as StoredOrder[]).map(hydrateOrder);
    } catch (error) {
      console.warn("[LocalStore] Read failed, returning empty list:", error);
      return [];
    }
  };

  const write = (orders: Order[]) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(orders.map(serializeOrder), null, 2), "utf8");
    } catch (error) {
      console.error("[LocalStore] Write failed:", error);
    }
  };

  return {
    create(values: InsertOrder): Order {
      const orders = read();
      if (orders.some(order => order.orderId === values.orderId)) throw new Error("Order ID already exists.");
      const now = new Date();
      const order: Order = {
        id: Math.max(0, ...orders.map(item => item.id)) + 1,
        orderId: values.orderId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        deliveryLocation: values.deliveryLocation,
        quantity: values.quantity,
        note: values.note ?? null,
        paymentMethod: values.paymentMethod,
        bkashNumber: values.bkashNumber ?? null,
        transactionId: values.transactionId ?? null,
        bookPrice: values.bookPrice,
        deliveryCharge: values.deliveryCharge,
        total: values.total,
        paymentStatus: values.paymentStatus,
        status: values.status ?? "confirmation_pending",
        sheetSyncState: values.sheetSyncState ?? "pending",
        sheetSyncError: values.sheetSyncError ?? null,
        sheetSyncedAt: values.sheetSyncedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      write([...orders, order]);
      return order;
    },
    getById(orderId: string) {
      return read().find(order => order.orderId === orderId);
    },
    getForTracking(orderId: string, phone: string) {
      return read().find(order => order.orderId === orderId && order.phone === phone);
    },
    list() {
      return read().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    },
    updateStatus(orderId: string, status: OrderStatus) {
      const orders = read();
      const index = orders.findIndex(order => order.orderId === orderId);
      if (index < 0) throw new Error("Order not found.");
      const updated: Order = { ...orders[index], status, sheetSyncState: "pending", sheetSyncError: null, updatedAt: new Date() };
      orders[index] = updated;
      write(orders);
      return updated;
    },
    updateSheetState(orderId: string, state: SheetSyncState, error?: string | null) {
      const orders = read();
      const index = orders.findIndex(order => order.orderId === orderId);
      if (index < 0) throw new Error("Order not found.");
      const updated: Order = {
        ...orders[index],
        sheetSyncState: state,
        sheetSyncError: error ?? null,
        sheetSyncedAt: state === "synced" ? new Date() : null,
        updatedAt: new Date(),
      };
      orders[index] = updated;
      write(orders);
      return updated;
    },
    delete(orderId: string) {
      write(read().filter(order => order.orderId !== orderId));
    },
  };
}