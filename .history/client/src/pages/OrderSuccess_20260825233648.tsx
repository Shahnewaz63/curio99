import { ArrowLeft, ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";

/** Nocturne Editorial reminder: use a calm navy confirmation page with one clear block of text and decisive navigation. */

type OrderSuccessData = { orderId: string; fullName: string; phone: string };

function getOrderSuccessData(): OrderSuccessData | null {
  try {
    const raw = sessionStorage.getItem("curio-order-success");
    return raw ? (JSON.parse(raw) as OrderSuccessData) : null;
  } catch {
    return null;
  }
}

export default function OrderSuccess() {
  const order = getOrderSuccessData();

  return (
    <main className="min-h-screen bg-[#07111F] px-5 py-10 text-[#F4F0E8] sm:px-8 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
        <section className="w-full border border-white/[.11] bg-[#0D1B2D] p-7 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#55E6E0]/45 bg-[#55E6E0]/10"><CheckCircle2 className="h-7 w-7 text-[#55E6E0]" /></div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-[#55E6E0]">Order received</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-extrabold tracking-[-.06em] sm:text-6xl">Thank you. Your order is in.</h1>
          <div className="mt-8 max-w-2xl border-l-2 border-[#FFCF27] pl-5 text-[16px] leading-8 text-[#B8C7D6]"><p>We have received your order{order?.fullName ? `, ${order.fullName}` : ""}. Please check your email for the latest update (check your spam folder just in case).</p><p className="mt-4">Our team will call you{order?.phone ? ` at ${order.phone}` : ""} to confirm your order before it is prepared for delivery.</p></div>
          {order?.orderId && <div className="mt-8 inline-flex items-center gap-3 border border-white/[.1] bg-white/[.035] px-4 py-3 text-sm text-[#A7B5C5]"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#71869C]">Order ID</span><span className="font-display font-extrabold text-[#F4F0E8]">#{order.orderId}</span></div>}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row"><a href="/" className="inline-flex items-center justify-center gap-2 border border-white/15 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#F4F0E8] transition hover:border-white/35 hover:bg-white/[.04]"><ArrowLeft className="h-4 w-4" /> Back to homepage</a><a href="/track-order" className="inline-flex items-center justify-center gap-2 bg-[#FFCF27] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#07111F] transition hover:bg-[#FFE25B]"><PhoneCall className="h-4 w-4" /> Track order <ArrowRight className="h-4 w-4" /></a></div>
        </section>
      </div>
    </main>
  );
}
