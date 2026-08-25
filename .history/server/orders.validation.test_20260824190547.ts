import { describe, expect, it } from "vitest";
import { orderInput } from "./routers";

const baseOrder = {
  fullName: "Test Customer",
  phone: "01700000000",
  email: "customer@example.com",
  address: "123 Test Road, Dhaka",
  location: "dhaka" as const,
  quantity: 1,
  payment: "bkash" as const,
  bkashNumber: "01700000000",
};

describe("bKash order validation", () => {
  it("requires a non-empty transaction ID when bKash is selected", () => {
    expect(orderInput.safeParse(baseOrder).success).toBe(false);
    expect(orderInput.safeParse({ ...baseOrder, transactionId: "TRX-12345" }).success).toBe(true);
  });
});
