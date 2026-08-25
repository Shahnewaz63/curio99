"use client";

import { useSearchParams } from "next/navigation";
import { trpc } from "@/utils/trpc"; // Adjust path to your tRPC client wrapper

export default function TrackPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const phone = searchParams.get("phone") || "";

  // tRPC handles fetching the JSON payload behind the scenes
  const { data: order, isLoading } = trpc.orders.track.useQuery(
    { orderId, phone },
    { enabled: Boolean(orderId && phone) }
  );

  if (isLoading) return <div className="p-6 text-center">Loading order status...</div>;
  if (!order) return <div className="p-6 text-center text-red-500">Order details not found.</div>;

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