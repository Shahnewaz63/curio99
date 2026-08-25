import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalOrderStore } from "./localOrderStore";


const tempDirectories: string[] = [];

function makeStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "curio-local-orders-"));
  tempDirectories.push(directory);
  return createLocalOrderStore(path.join(directory, "orders.json"));
}

afterEach(() => {
  tempDirectories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true }));
});

describe("local order store", () => {
  it("persists a placed order for local tracking without a database or Sheets connection", () => {
    const store = makeStore();
    const order = store.create({
      orderId: "CURIO-LOCAL01",
      fullName: "Local Customer",
      phone: "01700000000",
      email: "local@example.com",
      address: "Local development address",
      deliveryLocation: "dhaka",
      quantity: 1,
      paymentMethod: "cod",
      bookPrice: 249,
      deliveryCharge: 60,
      total: 309,
      paymentStatus: "Payment on delivery",
      status: "confirmation_pending",
    });

    expect(order.orderId).toBe("CURIO-LOCAL01");
    expect(store.getForTracking("CURIO-LOCAL01", "01700000000")?.total).toBe(309);
    expect(store.list()).toHaveLength(1);
  });
});
