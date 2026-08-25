import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context.js";
import { appRouter } from "./routers.js";

const localDataDirectory = path.join(process.cwd(), ".curio-local-data");
const priorSheetsDisabled = process.env.CURIO_DISABLE_SHEETS_SYNC;

function adminContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 1,
      openId: "bulk-admin",
      name: "Bulk administrator",
      email: "bulk-admin@example.com",
      loginMethod: "credential",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe.sequential("bulk order administration", () => {
  beforeEach(() => {
    process.env.CURIO_DISABLE_SHEETS_SYNC = "1";
    fs.rmSync(localDataDirectory, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(localDataDirectory, { recursive: true, force: true });
    if (priorSheetsDisabled === undefined) delete process.env.CURIO_DISABLE_SHEETS_SYNC;
    else process.env.CURIO_DISABLE_SHEETS_SYNC = priorSheetsDisabled;
  });

  it("updates and deletes the selected orders together", async () => {
    const caller = appRouter.createCaller(adminContext());
    const create = (fullName: string) => caller.orders.create({
      fullName,
      phone: "01700000000",
      email: `${fullName.toLowerCase().replaceAll(" ", ".")}@example.com`,
      address: "Local verification address",
      location: "dhaka",
      quantity: 1,
      payment: "cod",
    });

    const first = await create("Bulk one");
    const second = await create("Bulk two");
    const untouched = await create("Bulk untouched");

    const updated = await caller.orders.adminBulkUpdateStatus({
      orderIds: [first.orderId, second.orderId],
      status: "shipped",
    });
    expect(updated.map(order => order?.status)).toEqual(["shipped", "shipped"]);
    expect((await caller.orders.adminList()).find(order => order.orderId === untouched.orderId)?.status).toBe("confirmation_pending");

    const deleted = await caller.orders.adminBulkDeleteOrders({ orderIds: [first.orderId, second.orderId] });
    expect(deleted.deletedOrderIds.sort()).toEqual([first.orderId, second.orderId].sort());
    expect((await caller.orders.adminList()).map(order => order.orderId)).toEqual([untouched.orderId]);
  });
});
