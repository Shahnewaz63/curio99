import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOrder, deleteOrderById, getOrderById, listOrders, updateOrderStatus } from "./db.js";

const orderId = `CURIO-PG-${Date.now().toString(36).toUpperCase()}`;
const previousUsePostgres = process.env.CURIO_USE_POSTGRES;
const previousForceLocal = process.env.CURIO_FORCE_LOCAL_STORE;

beforeAll(() => {
  process.env.CURIO_USE_POSTGRES = "1";
  delete process.env.CURIO_FORCE_LOCAL_STORE;
});

afterAll(async () => {
  await deleteOrderById(orderId).catch(() => undefined);
  if (previousUsePostgres === undefined) delete process.env.CURIO_USE_POSTGRES;
  else process.env.CURIO_USE_POSTGRES = previousUsePostgres;
  if (previousForceLocal === undefined) delete process.env.CURIO_FORCE_LOCAL_STORE;
  else process.env.CURIO_FORCE_LOCAL_STORE = previousForceLocal;
});

describe("PostgreSQL order history", () => {
  it("persists and updates an isolated order record", async () => {
    const created = await createOrder({
      orderId,
      fullName: "PostgreSQL verification",
      phone: "01700000000",
      email: "postgres-verification@example.com",
      address: "Temporary verification record",
      deliveryLocation: "dhaka",
      quantity: 1,
      paymentMethod: "cod",
      bookPrice: 249,
      deliveryCharge: 60,
      total: 309,
      paymentStatus: "Payment on delivery",
      status: "confirmation_pending",
      sheetSyncState: "pending",
    });

    expect(created.orderId).toBe(orderId);
    expect((await getOrderById(orderId))?.status).toBe("confirmation_pending");

    const updated = await updateOrderStatus(orderId, "processing");
    expect(updated.status).toBe("processing");
    expect((await listOrders()).some(order => order.orderId === orderId)).toBe(true);
  });
});
