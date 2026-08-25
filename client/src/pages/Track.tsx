import { useSearch } from "wouter"; // or useSearchParams from react-router-dom
import { trpc } from "@/lib/trpc"; // adjust import relative to your client setup

export default function TrackOrder() {
  // Extract query parameters from URL (?orderId=...&phone=...)
  const searchString = window.location.search;
  const params = new URLSearchParams(searchString);
  const orderId = params.get("orderId") || "";
  const phone = params.get("phone") || "";

  const { data: order, isLoading, error } = trpc.orders.track.useQuery(
    { orderId, phone },
    { enabled: Boolean(orderId && phone) }
  );

  if (!orderId || !phone) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg">
        <h1 className="text-xl font-bold mb-2">Track Order</h1>
        <p className="text-gray-600">Please provide an Order ID and Phone number.</p>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 text-center">Loading order details...</div>;
  if (error || !order) return <div className="p-6 text-center text-red-500">Order not found.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg bg-white shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Order Status</h1>
      <div className="space-y-2">
        <p><strong>Order ID:</strong> {order.orderId}</p>
        <p><strong>Status:</strong> <span className="text-blue-600 font-semibold">{order.statusLabel}</span></p>
        <p><strong>Total Amount:</strong> ৳{order.total}</p>
        <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
      </div>
    </div>
  );
}