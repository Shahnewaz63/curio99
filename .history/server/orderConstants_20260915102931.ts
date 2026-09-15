export const BOOK_PRICE = 185;
export const INSIDE_DHAKA_CHARGE = 60;
export const OUTSIDE_DHAKA_CHARGE = 100;

export function calculateOrderTotals(location: "dhaka" | "outside", quantity: number) {
  const deliveryCharge = location === "dhaka" ? INSIDE_DHAKA_CHARGE : OUTSIDE_DHAKA_CHARGE;
  return {
    bookPrice: BOOK_PRICE,
    deliveryCharge,
    total: BOOK_PRICE * quantity + deliveryCharge,
  };
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function statusDescription(status: string) {
  if (status === "cancelled") {
    return "This order may have been cancelled by the customer or due to invalid customer information.";
  }
  return "";
}
