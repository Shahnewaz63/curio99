import { ArrowLeft, Check, CircleHelp, PackageCheck, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatBangladeshDateTime } from "@/lib/time";

type SuccessData = { orderId: string; phone: string };

function getInitialTrackingData(): SuccessData | null {
  // 1. Check URL query parameters (e.g., from email links)
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlOrderId = params.get("orderId");
    const urlPhone = params.get("phone");
    if (urlOrderId && urlPhone) {
      return { orderId: urlOrderId.trim(), phone: urlPhone.replace(/[\s-]/g, "") };
    }
  }

  // 2. Fall back to local session storage from order creation
  try {
    const raw = sessionStorage.getItem("curio-order-success");
    return raw ? (JSON.parse(raw) as SuccessData) : null;
  } catch {
    return null;
  }
}

export default function TrackOrder() {
  const initialData = getInitialTrackingData();
  const [orderId, setOrderId] = useState(initialData?.orderId ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [search, setSearch] = useState<{ orderId: string; phone: string } | null>(
    initialData ? { orderId: initialData.orderId, phone: initialData.phone } : null
  );

  const tracking = trpc.orders.track.useQuery(search!, { enabled: Boolean(search) });

  function submit(event: FormEvent) {
    event.preventDefault();
    setSearch({ orderId: orderId.trim(), phone: phone.replace(/[\s-]/g, "") });
  }

  const order = tracking.data;

  return (
    <main className="min-h-screen bg-[#07111F] px-5 py-10 text-[#F4F0E8] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#A7B5C5] transition hover:text-[#55E6E0]">
          <ArrowLeft className="h-4 w-4" /> Back to homepage
        </a>
        <section className="mt-10 border border-white/[.11] bg-[#0D1B2D] p-7 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#55E6E0]">Order tracking</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-.06em] sm:text-6xl">Know where it is.</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-[#A7B5C5]">Enter your order ID and delivery phone number to view its confirmation and delivery information.</p>
          
          <form onSubmit={submit} className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-3 border border-white/[.12] bg-[#07111F]/55 px-4">
              <Search className="h-4 w-4 text-[#55E6E0]" />
              <input value={orderId} onChange={event => setOrderId(event.target.value)} required placeholder="Order ID" className="w-full bg-transparent py-4 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" />
            </label>
            <input value={phone} onChange={event => setPhone(event.target.value)} required placeholder="Phone number" className="border border-white/[.12] bg-[#07111F]/55 px-4 py-4 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" />
            <button type="submit" className="bg-[#F4F0E8] px-6 py-4 text-[11px] font-bold uppercase tracking-[.14em] text-[#07111F] transition hover:bg-[#FFCF27]">Track order</button>
          </form>

          {tracking.isFetching && <p className="mt-6 text-sm text-[#A7B5C5]">Looking up your order…</p>}
          {tracking.error && <div className="mt-6 flex items-center gap-3 border border-[#F28773]/30 bg-[#F28773]/[.08] px-4 py-3 text-sm text-[#F6B1A4]"><CircleHelp className="h-4 w-4 shrink-0" /> The local server could not be reached. Run <code className="rounded bg-[#07111F]/60 px-1.5 py-0.5 text-[#F4F0E8]">pnpm dev</code> from the project folder, then try again.</div>}
          {search && !tracking.isFetching && !tracking.error && !order && <div className="mt-6 flex items-center gap-3 border border-[#F28773]/30 bg-[#F28773]/[.08] px-4 py-3 text-sm text-[#F6B1A4]"><CircleHelp className="h-4 w-4 shrink-0" /> We could not find an order matching those details.</div>}

          {order && (
            <div className="mt-10 border-t border-white/[.1] pt-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#71869C]">Your order</p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold">#{order.orderId}</h2>
                  <p className="mt-2 text-sm text-[#A7B5C5]">
                    Placed {formatBangladeshDateTime(order.createdAt)} · Last updated {formatBangladeshDateTime(order.updatedAt)}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold ${order.status === "cancelled" ? "border-[#F28773]/40 bg-[#F28773]/[.1] text-[#F6B1A4]" : "border-[#55E6E0]/35 bg-[#55E6E0]/[.08] text-[#B8FFFA]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${order.status === "cancelled" ? "bg-[#F28773]" : "bg-[#55E6E0]"}`} />
                  {order.statusLabel}
                </div>
              </div>

              {/* Order Information Grid (Now includes Total Amount & Quantity) */}
              <div className="mt-8 grid gap-4 border-y border-white/[.08] py-6 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[.13em] text-[#71869C]">Total Amount</p>
                  <p className="mt-2 text-base font-bold text-[#55E6E0]">
                    ৳{order.total}{" "}
                    <span className="text-xs font-normal text-[#A7B5C5]">
                      ({order.quantity} {order.quantity > 1 ? "copies" : "copy"})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[.13em] text-[#71869C]">Confirmation</p>
                  <p className="mt-2 text-sm font-semibold text-[#F4F0E8]">
                    {order.status === "cancelled" ? "Not proceeding" : order.status === "confirmation_pending" ? "Call pending" : "Confirmed"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[.13em] text-[#71869C]">Delivery</p>
                  <p className="mt-2 text-sm font-semibold text-[#F4F0E8]">
                    {order.deliveryLocation === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[.13em] text-[#71869C]">Payment</p>
                  <p className="mt-2 text-sm font-semibold text-[#F4F0E8]">{order.paymentStatus}</p>
                </div>
              </div>

              {order.status === "cancelled" ? (
                <div className="mt-7 flex items-start gap-4 border border-[#F28773]/30 bg-[#F28773]/[.08] p-4 text-sm leading-6 text-[#F6B1A4]">
                  <CircleHelp className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>This order may have been cancelled by the customer or due to invalid customer information. Please contact us if you need assistance.</p>
                </div>
              ) : (
                <div className="mt-7 flex items-start gap-4 text-sm leading-6 text-[#A7B5C5]">
                  <PackageCheck className="mt-0.5 h-5 shrink-0 text-[#55E6E0]" />
                  <p>We will call <span className="font-semibold text-[#F4F0E8]">{order.phone}</span> to confirm your order of <span className="font-semibold text-[#F4F0E8]">৳{order.total}</span>. Once confirmed, this page will update with the latest status.</p>
                </div>
              )}

              <div className={`mt-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.13em] ${order.status === "cancelled" ? "text-[#F28773]" : "text-[#55E6E0]"}`}>
                <Check className="h-4 w-4" /> {order.status === "cancelled" ? "Order cancelled" : "Order received"}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}