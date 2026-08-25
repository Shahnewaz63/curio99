import { describe, expect, it } from "vitest";
import { calculateOrderTotals, statusDescription, statusLabel } from "./orderConstants.js";

describe("order calculations", () => {
  it("uses the correct delivery charge for each Bangladesh delivery region", () => {
    expect(calculateOrderTotals("dhaka", 2)).toEqual({ bookPrice: 249, deliveryCharge: 60, total: 558 });
    expect(calculateOrderTotals("outside", 1)).toEqual({ bookPrice: 249, deliveryCharge: 120, total: 369 });
  });

  it("turns persistent status values into readable labels", () => {
    expect(statusLabel("confirmation_pending")).toBe("Confirmation Pending");
    expect(statusDescription("cancelled")).toContain("cancelled by the customer");
  });
});
