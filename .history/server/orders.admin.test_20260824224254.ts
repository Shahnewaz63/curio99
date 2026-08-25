import { describe, expect, it } from "vitest";
import { appRouter } from "./routers.js";
import type { TrpcContext } from "./_core/context.js";

function nonAdminContext(): TrpcContext {
  return {
    user: {
      id: 999,
      openId: "non-admin-test-user",
      name: "Non-admin test user",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("owner-only orders administration", () => {
  it("rejects an authenticated non-admin user from listing private orders", async () => {
    const caller = appRouter.createCaller(nonAdminContext());
    await expect(caller.orders.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an authenticated non-admin user from deleting an order", async () => {
    const caller = appRouter.createCaller(nonAdminContext());
    await expect(caller.orders.adminDeleteOrder({ orderId: "CURIO-DELETE1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
