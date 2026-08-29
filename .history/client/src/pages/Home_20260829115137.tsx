import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  CreditCard,
  Facebook,
  Instagram,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatBangladeshDate } from "@/lib/time";

export const STORE_CONFIG = {
  bookName: "99 Life Hacks",
  bookKicker: "Practical skills for everyday life",
  bookDescription:
    "Practical skills for technology, study, fitness, finance, and the connections that make everyday life work better.",
  bookPrice: 249,
  insideDhakaCharge: 70,
  outsideDhakaCharge: 120,
  bkashNumber: "01908579453",
  contactNumber: "+880 1603453483",
  whatsAppNumber: "8801603453483",
  email: "info.curiobd@gmail.com",
  socialLinks: {
    instagram: "https://www.instagram.com/curiobd_official/",
    facebook: "https://www.facebook.com/profile.php?id=61593414137387",
  },
  logoSrc: "/images/logo.png",
  coverSrc: "/images/coverpage.png",
  ambientSrc: "/manus-storage/lumen-ambient-texture_0d58c35b.png",
  authors: [
    {
      name: "Shahnewaz Hossain",
      role: "Founder",
      initials: "SH",
      portraitSrc: "/images/snz.png",
      bio: "An author and BUET CSE student, Shahnewaz is passionate about learning, technology, and personal growth. His goal is to inspire Gen Z to think smarter, develop meaningful skills, and build a better life.",
    },
    {
      name: "Md Atikuzzaman",
      role: "Co-founder",
      initials: "AC",
      portraitSrc: "/images/navid.png",
      bio: "Atikuzzaman is a BUET CSE student, co-author of a book, and an adviser on developing ideas. He is passionate about guiding young students, helping them turn their ideas into meaningful work, and encouraging them to build a better future.",
    },
  ],
  previewPages: [
    {
      src: "/images/page-1.jpg",
      alt: "99 Life Hacks book cover",
    },
    {
      src: "/images/page-2.jpg",
      alt: "99 Life Hacks preview page 2",
    },
    {
      src: "/images/page-3.jpg",
      alt: "99 Life Hacks preview page 3",
    },
    {
      src: "/images/page-4.jpg",
      alt: "99 Life Hacks preview page 4",
    },
    {
      src: "/images/page-5.jpg",
      alt: "99 Life Hacks preview page 5",
    },
    {
      src: "/images/page-6.jpg",
      alt: "99 Life Hacks preview page 6",
    },
    {
      src: "/images/page-7.jpg",
      alt: "99 Life Hacks preview page 7",
    },
    {
      src: "/images/page-8.jpg",
      alt: "99 Life Hacks preview page 8",
    },
    {
      src: "/images/page-9.jpg",
      alt: "99 Life Hacks preview page 8",
    },
  ],
};

type DeliveryLocation = "dhaka" | "outside";
type PaymentMethod = "cod" | "bkash";
type FormState = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  location: DeliveryLocation;
  quantity: number;
  note: string;
  payment: PaymentMethod;
  bkashNumber: string;
  transactionId: string;
};
type OrderRecord = FormState & {
  orderId: string;
  bookPrice: number;
  deliveryCharge: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  orderDate: string;
  lastUpdated: string;
};

const emptyForm: FormState = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  location: "dhaka",
  quantity: 1,
  note: "",
  payment: "cod",
  bkashNumber: "",
  transactionId: "",
};

function money(value: number) {
  return `৳${value.toLocaleString("en-BD")}`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Logo({ compact = false, showWordmark = false }: { compact?: boolean; showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border border-[#FFCF27]/70 bg-[linear-gradient(135deg,#FFCF27_0%,#F4B51F_100%)] p-1.5 shadow-[0_8px_20px_rgba(255,207,39,.22)] ${compact ? "origin-left scale-[.85]" : ""}`} aria-label="Curio">
      <img src={STORE_CONFIG.logoSrc} alt="Curio symbol" className="h-9 w-8 object-contain drop-shadow-[0_3px_8px_rgba(7,17,31,.2)] sm:h-10 sm:w-9" />
      {showWordmark && <span className="pr-2 font-display text-[28px] font-bold leading-none tracking-[-.08em] text-[#07111F]">URIO</span>}
    </div>
  );
}

function SectionIntro({
  label,
  title,
  copy,
  light = false,
}: {
  label: string;
  title: string;
  copy: string;
  light?: boolean;
}) {
  return (
    <div className={`grid gap-4 lg:grid-cols-[1fr] ${light ? "text-[#07111F]" : ""}`}>
      <div className="max-w-2xl">
        <p className={`eyebrow mb-3 ${light ? "!text-[#357D7C]" : ""}`}>{label}</p>
        <h2 className="font-display text-3xl font-extrabold tracking-[-.045em] sm:text-5xl">{title}</h2>
        <p className={`mt-4 max-w-xl text-[15px] leading-7 ${light ? "text-[#07111F]/65" : "text-[#A7B5C5]"}`}>{copy}</p>
      </div>
    </div>
  );
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="mb-2 block font-display text-[12px] font-bold tracking-[.02em] text-[#DCE5EE]">
      {children} {optional && <span className="font-normal text-[#71869C]">(optional)</span>}
    </label>
  );
}

function BookCover({ small = false }: { small?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-[#081524] shadow-[22px_28px_52px_rgba(0,0,0,.3)] ${small ? "w-[54px] aspect-[1413/2000] rounded-[5px]" : "w-[min(72vw,355px)] aspect-[1413/2000] rounded-[7px] sm:w-[325px]"}`}>
      <img src={STORE_CONFIG.coverSrc} alt="99 Life Hacks by Shahnewaz Hossain" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

function Header({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (open: boolean) => void }) {
  const links = [
    { label: "Order", id: "order" },
    { label: "Preview", id: "preview" },
    { label: "Track order", id: "tracking", href: "/track-order" },
    { label: "About", id: "about" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#07111F]/82 backdrop-blur-xl">
      <div className="container relative flex h-[72px] items-center justify-between">
        <button onClick={() => scrollToSection("top")} aria-label="Go to top">
          <Logo />
        </button>
        <button className="rounded-full border border-white/10 p-2 text-[#F4F0E8] transition hover:border-[#55E6E0]/60 hover:text-[#55E6E0]" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-white/[.08] bg-[#0A1728] px-5 pb-5 pt-3">
          {links.map((link) => (
            <button key={link.id} onClick={() => { if (link.href) window.location.assign(link.href); else scrollToSection(link.id); setMenuOpen(false); }} className="flex w-full items-center gap-3 border-b border-white/[.07] py-4 text-left font-display text-sm font-bold text-[#F4F0E8]">
              {link.label}<ArrowRight className="ml-auto h-4 w-4 text-[#55E6E0]" />
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden border-b border-white/[.07] bg-[#07111F]">
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_top,rgba(255,207,39,.12),transparent_72%)]" />
      <div className="absolute inset-x-0 top-5 z-10 flex justify-center px-5">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#FFCF27]/70 bg-[#FFCF27]/12 px-4 py-2 font-display text-[11px] font-extrabold tracking-[.12em] shadow-[0_8px_22px_rgba(255,207,39,.12)]">
          <span className="text-[#A7B5C5] line-through decoration-[#FFCF27]/70 decoration-1">৳299</span>
          <span className="h-3 w-px bg-[#FFCF27]/45" />
          <span className="text-[#FFCF27]">৳249</span>
        </div>
      </div>
      <div className="container relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center py-16 sm:py-20">
        {/* Live Sold Counter Badge */}
        <div className="reveal mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#081524]/85 px-4 py-1.5 text-xs backdrop-blur-md shadow-lg">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-display font-extrabold text-white">17</span>
          <span className="text-[#A7B5C5]">sold recently</span>
        </div>

        <div className="reveal relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[#FFCF27]/18 blur-2xl" />
          <BookCover />
        </div>

        {/* Action Buttons Grid */}
        <div className="reveal mt-8 flex flex-col items-center gap-3 w-full max-w-sm" style={{ animationDelay: "100ms" }}>
          <div className="flex w-full items-center justify-center gap-3">
            <button onClick={() => scrollToSection("order")} className="group relative flex-1 inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-[#FFCF27]/70 bg-[linear-gradient(135deg,#FFCF27_0%,#F4B51F_100%)] px-6 py-3.5 font-display text-[12px] font-extrabold uppercase tracking-[.13em] text-[#07111F] shadow-[0_12px_28px_rgba(255,207,39,.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(255,207,39,.35)] active:scale-[.97]">
              <span aria-hidden="true" className="absolute -left-6 top-0 h-full w-8 -skew-x-12 bg-white/35 transition-transform duration-500 group-hover:translate-x-36" />
              <span className="relative">Order</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => scrollToSection("preview")} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-display text-[12px] font-extrabold uppercase tracking-[.13em] text-[#F4F0E8] transition hover:border-[#55E6E0]/60 hover:bg-white/[.04] active:scale-[.97]">
              Preview <Sparkles className="h-4 w-4 text-[#55E6E0]" />
            </button>
          </div>

          {/* Styled Track Order Button Beneath Order & Preview */}
          <a
            href="/track-order"
            className="group w-full inline-flex items-center justify-center gap-2.5 rounded-full border border-[#55E6E0]/40 bg-[#55E6E0]/[.08] px-6 py-3.5 font-display text-[12px] font-extrabold uppercase tracking-[.14em] text-[#B8FFFA] shadow-[0_8px_20px_rgba(85,230,224,.12)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#55E6E0]/80 hover:bg-[#55E6E0]/20 hover:shadow-[0_12px_28px_rgba(85,230,224,.22)] active:scale-[.97]"
          >
            <PackageCheck className="h-4 w-4 text-[#55E6E0] transition-transform group-hover:scale-110" />
            <span>Track Order</span>
            <ArrowRight className="h-4 w-4 text-[#55E6E0] transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}

function OrderForm({ onOrder, onDraftChange }: { onOrder: (order: OrderRecord) => void; onDraftChange: (draft: FormState) => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copiedBkash, setCopiedBkash] = useState(false);
  const createOrder = trpc.orders.create.useMutation();

  useEffect(() => { onDraftChange(form); }, [form, onDraftChange]);
  const deliveryCharge = form.location === "dhaka" ? STORE_CONFIG.insideDhakaCharge : STORE_CONFIG.outsideDhakaCharge;
  const subtotal = STORE_CONFIG.bookPrice * form.quantity;
  const total = subtotal + deliveryCharge;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleCopyBkash = () => {
    if (STORE_CONFIG.bkashNumber) {
      navigator.clipboard.writeText(STORE_CONFIG.bkashNumber);
      setCopiedBkash(true);
      toast.success("bKash number copied to clipboard!");
      setTimeout(() => setCopiedBkash(false), 2000);
    }
  };

  function validate() {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Please add your full name.";
    if (!/^(?:\+?8801|01|1)[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ""))) next.phone = "Enter a valid Bangladesh phone number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!form.address.trim()) next.address = "Please add a delivery address.";
    if (form.payment === "bkash" && !form.bkashNumber.trim()) next.bkashNumber = "Add the bKash number used for payment.";
    if (form.payment === "bkash" && !form.transactionId.trim()) next.transactionId = "Add the bKash transaction ID.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      toast.error("A few details need your attention.", { description: "Check the highlighted fields before placing your order." });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createOrder.mutateAsync({
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        location: form.location,
        quantity: Number(form.quantity),
        note: form.note.trim() || undefined,
        payment: form.payment,
        bkashNumber: form.payment === "bkash" ? (form.bkashNumber.trim() || undefined) : undefined,
        transactionId: form.payment === "bkash" ? (form.transactionId.trim() || undefined) : undefined,
      });
      const order: OrderRecord = {
        ...form,
        orderId: created.orderId,
        bookPrice: created.bookPrice,
        deliveryCharge: created.deliveryCharge,
        total: created.total,
        paymentStatus: created.paymentStatus,
        orderStatus: created.status,
        orderDate: formatBangladeshDate(created.createdAt),
        lastUpdated: "Just now",
      };
      sessionStorage.setItem("curio-order-success", JSON.stringify({ orderId: created.orderId, fullName: created.fullName, phone: created.phone }));
      onOrder(order);
    } catch {
      toast.error("Your order could not be placed.", { description: "Make sure the local server is running with pnpm dev, then try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-panel rounded-2xl p-5 sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-5"><div><p className="eyebrow mb-2">Your details</p><h3 className="font-display text-2xl font-extrabold tracking-[-.04em]">Get Your Copy.</h3></div><span className="rounded-full border border-[#55E6E0]/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-[#55E6E0]">Secure form</span></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><FieldLabel>Full name</FieldLabel><div className="field-shell rounded-lg"><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your name" className="w-full bg-transparent px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" aria-invalid={!!errors.fullName} /> </div>{errors.fullName && <p className="mt-1.5 text-xs text-[#F28773]">{errors.fullName}</p>}</div>
        <div><FieldLabel>Contact number</FieldLabel><div className="field-shell flex items-center gap-2 rounded-lg px-4"><span className="text-xs text-[#71869C]">+880</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="1XXXXXXXXX" className="w-full bg-transparent py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" aria-invalid={!!errors.phone} /></div>{errors.phone && <p className="mt-1.5 text-xs text-[#F28773]">{errors.phone}</p>}</div>
        <div><FieldLabel optional>Email address</FieldLabel><div className="field-shell rounded-lg"><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" className="w-full bg-transparent px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" aria-invalid={!!errors.email} /></div>{errors.email && <p className="mt-1.5 text-xs text-[#F28773]">{errors.email}</p>}</div>
        <div className="sm:col-span-2"><FieldLabel>Delivery address</FieldLabel><div className="field-shell rounded-lg"><textarea value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House, road, area, city" rows={3} className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" aria-invalid={!!errors.address} /></div>{errors.address && <p className="mt-1.5 text-xs text-[#F28773]">{errors.address}</p>}</div>
      </div>

      <div className="mt-8 border-t border-white/[.08] pt-7"><div className="mb-3 flex items-center justify-between"><FieldLabel>Delivery location</FieldLabel><span className="text-[10px] uppercase tracking-[.13em] text-[#71869C]">Bangladesh</span></div><div className="grid gap-3 sm:grid-cols-2">{(["dhaka", "outside"] as DeliveryLocation[]).map((location) => <label key={location} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${form.location === location ? "border-[#55E6E0]/55 bg-[#55E6E0]/[.08]" : "border-white/[.1] bg-white/[.02] hover:border-white/20"}`}><input type="radio" name="location" checked={form.location === location} onChange={() => update("location", location)} className="accent-[#55E6E0]" /><span className="flex-1"><span className="block text-sm font-semibold text-[#F4F0E8]">{location === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</span><span className="mt-1 block text-xs text-[#71869C]">{money(location === "dhaka" ? STORE_CONFIG.insideDhakaCharge : STORE_CONFIG.outsideDhakaCharge)} delivery</span></span>{form.location === location && <Check className="h-4 w-4 text-[#55E6E0]" />}</label>)}</div></div>

      <div className="mt-8 grid gap-7 border-t border-white/[.08] pt-7 sm:grid-cols-2"><div><FieldLabel>Quantity</FieldLabel><div className="inline-flex items-center rounded-lg border border-white/[.13] bg-[#07111F]/45"><button type="button" onClick={() => update("quantity", Math.max(1, form.quantity - 1))} className="flex h-11 w-11 items-center justify-center text-[#A7B5C5] transition hover:text-[#55E6E0]" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button><span className="w-8 text-center font-display text-sm font-extrabold text-[#F4F0E8]">{form.quantity}</span><button type="button" onClick={() => update("quantity", form.quantity + 1)} className="flex h-11 w-11 items-center justify-center text-[#A7B5C5] transition hover:text-[#55E6E0]" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button></div></div><div><FieldLabel optional>Note</FieldLabel><input value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="A delivery note?" className="field-shell w-full rounded-lg px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" /></div></div>

      <div className="mt-8 border-t border-white/[.08] pt-7">
        <FieldLabel>Payment method</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["cod", "bkash"] as PaymentMethod[]).map((method) => (
            <label key={method} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${form.payment === method ? "border-[#55E6E0]/55 bg-[#55E6E0]/[.08]" : "border-white/[.1] bg-white/[.02] hover:border-white/20"}`}>
              <input type="radio" name="payment" checked={form.payment === method} onChange={() => update("payment", method)} className="mt-1 accent-[#55E6E0]" />
              <span className="flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#F4F0E8]">
                  {method === "cod" ? <Truck className="h-4 w-4 text-[#55E6E0]" /> : <CreditCard className="h-4 w-4 text-[#55E6E0]" />}
                  {method === "cod" ? "Cash on delivery" : "bKash"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#71869C]">
                  {method === "cod" ? "Pay when your book arrives." : `Send Money to ${STORE_CONFIG.bkashNumber}. Copy the Bkash Transaction ID and paste.`}
                </span>
              </span>
              {form.payment === method && <Check className="h-4 w-4 text-[#55E6E0]" />}
            </label>
          ))}
        </div>

        {form.payment === "bkash" && (
          <div className="mt-4 grid gap-4 rounded-xl border border-[#55E6E0]/20 bg-[#55E6E0]/[.045] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#55E6E0]/30 bg-[#07111F]/70 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#55E6E0]/15 text-[#55E6E0]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#71869C]">bKash Number (Send Money)</p>
                  <p className="font-mono text-base font-extrabold text-[#F4F0E8]">{STORE_CONFIG.bkashNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyBkash}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#55E6E0]/40 bg-[#55E6E0]/10 px-3.5 py-2 font-display text-[11px] font-extrabold uppercase tracking-[.1em] text-[#B8FFFA] transition hover:bg-[#55E6E0]/20 active:scale-95"
              >
                {copiedBkash ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#55E6E0]" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#55E6E0]" /> Tap to Copy
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>bKash number</FieldLabel>
                <input value={form.bkashNumber} onChange={(e) => update("bkashNumber", e.target.value)} placeholder="01XXXXXXXXX" className="field-shell w-full rounded-lg px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" />
                {errors.bkashNumber && <p className="mt-1.5 text-xs text-[#F28773]">{errors.bkashNumber}</p>}
              </div>
              <div>
                <FieldLabel>Transaction ID</FieldLabel>
                <input required value={form.transactionId} onChange={(e) => update("transactionId", e.target.value)} placeholder="Enter your transaction ID" className="field-shell w-full rounded-lg px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#63778D] focus:outline-none" aria-invalid={!!errors.transactionId} />
                {errors.transactionId && <p className="mt-1.5 text-xs text-[#F28773]">{errors.transactionId}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-white/[.08] pt-7 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs leading-5 text-[#71869C]"><ShieldCheck className="h-4 w-4 shrink-0 text-[#55E6E0]" /> Your details stay private and are only used for delivery.</p><button type="submit" disabled={submitting} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#55E6E0] px-6 py-3.5 font-display text-[12px] font-extrabold uppercase tracking-[.13em] text-[#07111F] transition hover:-translate-y-0.5 hover:bg-[#B8FFFA] disabled:cursor-wait disabled:opacity-70">{submitting ? "Placing order…" : `Place order · ${money(total)}`} {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</button></div>
    </form>
  );
}

function OrderSummary({ order, draft }: { order: OrderRecord | null; draft: FormState }) {
  const quantity = order?.quantity ?? draft.quantity;
  const location = order?.location ?? draft.location;
  const payment = order?.payment ?? draft.payment;
  const delivery = order?.deliveryCharge ?? (location === "dhaka" ? STORE_CONFIG.insideDhakaCharge : STORE_CONFIG.outsideDhakaCharge);
  const subtotal = order?.bookPrice ? order.bookPrice * quantity : STORE_CONFIG.bookPrice * quantity;
  const total = order?.total ?? subtotal + delivery;
  return (
    <aside className="glass-panel h-fit overflow-hidden rounded-2xl lg:sticky lg:top-28">
      <div className="border-b border-white/[.08] px-5 py-5 sm:px-7"><div className="flex items-center justify-between"><div><p className="eyebrow mb-2">Order summary</p><h3 className="font-display text-xl font-extrabold">Your edition</h3></div><PackageCheck className="h-5 w-5 text-[#55E6E0]" /></div></div>
      <div className="space-y-6 p-5 sm:p-7"><div className="flex gap-4"><BookCover small /><div className="min-w-0"><p className="font-display text-sm font-bold text-[#F4F0E8]">{STORE_CONFIG.bookName}</p><p className="mt-1 text-xs leading-5 text-[#71869C]">First edition<br />Hardcover · 208 pages</p><p className="mt-3 font-display text-sm font-bold text-[#55E6E0]">{money(STORE_CONFIG.bookPrice)}</p></div></div><div className="space-y-3 border-t border-white/[.08] pt-5 text-sm"><div className="flex justify-between text-[#91A3B8]"><span>Quantity</span><span className="text-[#F4F0E8]">× {quantity}</span></div><div className="flex justify-between text-[#91A3B8]"><span>Subtotal</span><span className="text-[#F4F0E8]">{money(subtotal)}</span></div><div className="flex justify-between text-[#91A3B8]"><span>Delivery · {location === "dhaka" ? "Dhaka" : "outside Dhaka"}</span><span className="text-[#F4F0E8]">{money(delivery)}</span></div></div><div className="border-t border-[#55E6E0]/25 pt-5"><div className="flex items-end justify-between"><span className="font-display text-xs font-bold uppercase tracking-[.13em] text-[#A7B5C5]">Total</span><span className="font-display text-3xl font-extrabold tracking-[-.05em] text-[#55E6E0]">{money(total)}</span></div><p className="mt-2 text-right text-[10px] uppercase tracking-[.13em] text-[#71869C]">{payment === "bkash" ? "bKash selected" : "Cash on delivery"}</p></div><div className="flex gap-3 rounded-lg bg-white/[.035] p-3 text-xs leading-5 text-[#71869C]"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#55E6E0]" /> Every order includes tracked delivery across Bangladesh.</div></div>
    </aside>
  );
}

function Confirmation({ order }: { order: OrderRecord }) {
  return <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-10"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#55E6E0]/10 blur-3xl" /><div className="relative max-w-xl"><div className="mb-7 flex h-14 w-14 items-center justify-center rounded-full border border-[#55E6E0]/40 bg-[#55E6E0]/10"><CheckCircle2 className="h-7 w-7 text-[#55E6E0]" /></div><p className="eyebrow mb-3">Order received</p><h3 className="font-display text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">It’s on its way<br />to becoming yours.</h3><p className="mt-5 max-w-md text-[15px] leading-7 text-[#A7B5C5]">Thank you, {order.fullName.split(" ")[0]}. We’ll confirm your order and send delivery updates to {order.email || "your contact details"}.</p><div className="mt-8 grid gap-4 border-y border-white/[.1] py-5 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-[.14em] text-[#71869C]">Order ID</p><p className="mt-1 font-display text-sm font-extrabold text-[#55E6E0]">#{order.orderId}</p></div><div><p className="text-[10px] uppercase tracking-[.14em] text-[#71869C]">Total</p><p className="mt-1 font-display text-sm font-extrabold text-[#F4F0E8]">{money(order.total)}</p></div><div><p className="text-[10px] uppercase tracking-[.14em] text-[#71869C]">Delivery</p><p className="mt-1 font-display text-sm font-extrabold text-[#F4F0E8]">{order.location === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</p></div></div><a href="/track-order" className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#55E6E0]/45 px-5 py-3 font-display text-[11px] font-extrabold uppercase tracking-[.14em] text-[#B8FFFA] transition hover:bg-[#55E6E0]/10">Track your order <ArrowRight className="h-4 w-4" /></a></div></div>;
}

function Preview() {
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState(false);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const touchStart = useRef<number | null>(null);
  const current = STORE_CONFIG.previewPages[page];
  const goToOrder = () => scrollToSection("order");

  useEffect(() => {
    setImageState("loading");
    const nextPage = STORE_CONFIG.previewPages[page + 1];
    if (nextPage) {
      const preload = new Image();
      preload.src = nextPage.src;
    }
  }, [page, retryNonce]);

  const retryCurrentPage = () => {
    setImageState("loading");
    setRetryNonce(currentRetry => currentRetry + 1);
  };

  const turn = (direction: 1 | -1) => {
    const next = page + direction;
    if (next < 0 || next >= STORE_CONFIG.previewPages.length) return;
    setTurning(true);
    window.setTimeout(() => setTurning(false), 300);
    setPage(next);
  };

  return (
    <section id="preview" className="border-t border-white/[.07] bg-[#07111F] py-24 sm:py-32">
      <div className="container">
        <h2 className="font-display text-center font-extrabold tracking-[-.045em] text-[#F4F0E8] text-3xl sm:text-4xl">
          Read a few pages.
        </h2>
        <div className="mt-14">
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="absolute -inset-5 rounded-[2rem] bg-[#55E6E0]/[.07] blur-xl" />
            <div
              onTouchStart={(e) => { touchStart.current = e.changedTouches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStart.current === null) return;
                const delta = e.changedTouches[0].clientX - touchStart.current;
                if (Math.abs(delta) > 40) turn(delta < 0 ? 1 : -1);
                touchStart.current = null;
              }}
              className={`relative aspect-[1413/2000] overflow-hidden rounded-xl border border-white/15 bg-[#0D1B2D] shadow-[18px_24px_50px_rgba(0,0,0,.3)] ${turning ? "page-turn" : ""}`}
            >
              {imageState !== "ready" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0D1B2D] px-6 text-center" aria-live="polite">
                  {imageState === "loading" ? (
                    <>
                      <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#55E6E0]/25 border-t-[#55E6E0]" />
                      <p className="text-xs font-semibold text-[#A7B5C5]">Loading preview page…</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#F4F0E8]">Preview page could not load.</p>
                      <button type="button" onClick={retryCurrentPage} className="rounded-full border border-[#55E6E0]/45 px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#B8FFFA] transition hover:bg-[#55E6E0]/10">
                        Try again
                      </button>
                    </>
                  )}
                </div>
              )}
              <img
                key={`${page}-${retryNonce}`}
                src={current.src}
                alt={current.alt}
                loading={page === 0 ? "eager" : "lazy"}
                fetchPriority={page === 0 ? "high" : "auto"}
                decoding="async"
                onLoad={() => setImageState("ready")}
                onError={() => setImageState("error")}
                className={`h-full w-full object-cover transition-opacity duration-200 ${imageState === "ready" ? "opacity-100" : "opacity-0"}`}
              />
            </div>
            
            <div className="relative z-10 mt-5 flex items-center justify-between">
              <button onClick={() => turn(-1)} disabled={page === 0} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#71869C] transition hover:text-[#55E6E0] disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="font-display text-sm font-extrabold text-[#F4F0E8]/60">
                Page {page + 1} <span className="font-normal">/</span> {STORE_CONFIG.previewPages.length}
              </span>
              <button onClick={() => turn(1)} disabled={page === STORE_CONFIG.previewPages.length - 1} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#71869C] transition hover:text-[#55E6E0] disabled:opacity-30">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Preview Action Buttons Grid */}
            <div className="relative z-10 mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={goToOrder}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#55E6E0]/45 px-5 py-3.5 font-display text-[11px] font-extrabold uppercase tracking-[.13em] text-[#B8FFFA] transition hover:-translate-y-0.5 hover:bg-[#55E6E0]/10"
              >
                Order after reading <ArrowRight className="h-4 w-4 text-[#55E6E0]" />
              </button>
              
              {/* Expanded Open PDF Button */}
              <a
                href="https://drive.google.com/file/d/1XNaPlbdi3m7FkZ-mAKKoaIJmiLm0di_L/view?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3.5 font-display text-[11px] font-extrabold uppercase tracking-[.14em] text-[#A7B5C5] transition hover:-translate-y-0.5 hover:border-[#55E6E0]/55 hover:text-[#B8FFFA]"
              >
                Open PDF <span className="text-[#55E6E0]">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-t border-white/[.07] py-24 sm:py-32">
      <div className="container">
        <SectionIntro label="OUR MISSION" title="Technology that works for you." copy="We built this platform to simplify your daily experience." />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {STORE_CONFIG.authors.map((author) => (
            <article key={author.name} className="group relative overflow-hidden rounded-2xl border border-white/[.1] bg-[#0D1B2D] p-6 transition hover:-translate-y-1 hover:border-[#55E6E0]/35 sm:p-8">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#55E6E0]/[.05] blur-2xl" />
              <div className="relative flex items-start gap-5">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#55E6E0]/45 bg-[#55E6E0]/[.08] shadow-[0_6px_18px_rgba(0,0,0,.24)]">
                  <img src={author.portraitSrc} alt={`Portrait of ${author.name}`} className="h-full w-full object-cover object-center" />
                </div>
                <div>
                  <p className="eyebrow mb-1">CURIO</p>
                  <h3 className="font-display text-xl font-extrabold tracking-[-.04em]">{author.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[.13em] text-[#71869C]">{author.role}</p>
                </div>
              </div>
              <p className="relative mt-7 max-w-md text-sm leading-7 text-[#A7B5C5]">{author.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[.07] bg-[#050D17] py-12">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr_.8fr] md:gap-16">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-[-.06em] text-[#F5F7F5]">
              Curio
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#71869C]">
              Grow smarter, Live better.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-4">Explore</p>
            <div className="grid gap-3 text-sm text-[#A7B5C5]">
              <button className="w-fit transition hover:text-[#55E6E0]" onClick={() => scrollToSection("order")}>
                Order a copy
              </button>
              <button className="w-fit transition hover:text-[#55E6E0]" onClick={() => scrollToSection("preview")}>
                Preview
              </button>
              <a className="w-fit transition hover:text-[#55E6E0]" href="/track-order">
                Track order
              </a>
              <button className="w-fit transition hover:text-[#55E6E0]" onClick={() => scrollToSection("about")}>
                About Curio
              </button>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Keep in touch</p>
            <div className="space-y-3 text-sm text-[#A7B5C5]">
              <a
                className="flex items-center gap-2 transition hover:text-[#55E6E0]"
                href={`https://wa.me/${STORE_CONFIG.whatsAppNumber}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with Curio on WhatsApp"
              >
                <img src="/images/whatsapp.png" alt="WhatsApp" className="h-[18px] w-[18px] shrink-0 object-contain" />
                {STORE_CONFIG.contactNumber}
              </a>
              <a className="flex items-center gap-2 transition hover:text-[#55E6E0]" href={`mailto:${STORE_CONFIG.email}`}>
                <Copy className="h-4 w-4 text-[#55E6E0]" />
                {STORE_CONFIG.email}
              </a>
              <div className="flex gap-3 pt-2">
                <a href={STORE_CONFIG.socialLinks.instagram} aria-label="Instagram" className="rounded-full border border-white/10 p-2 transition hover:border-[#55E6E0]/50 hover:text-[#55E6E0]">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href={STORE_CONFIG.socialLinks.facebook} aria-label="Facebook" className="rounded-full border border-white/10 p-2 transition hover:border-[#55E6E0]/50 hover:text-[#55E6E0]">
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[.08] pt-5 text-[10px] uppercase tracking-[.13em] text-[#53677D] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Curio. All rights reserved.</span>
          <span>Designed by Shahnewaz</span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderRecord | null>(null);
  const [draftForm, setDraftForm] = useState<FormState>(emptyForm);
  useEffect(() => { if (lastOrder) window.location.assign("/order-success"); }, [lastOrder]);
  const orderTotalLabel = useMemo(() => lastOrder ? money(lastOrder.total) : money(STORE_CONFIG.bookPrice + STORE_CONFIG.insideDhakaCharge), [lastOrder]);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07111F] text-[#F4F0E8]">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        <Hero />
        <section id="order" className="scroll-mt-24 py-24 sm:py-32">
          <div className="container">
            <SectionIntro label="Reserve your copy" title="Guaranteed Delivery Across Bangladesh." copy={`The first edition is ${money(STORE_CONFIG.bookPrice)}. Estimated arrival in 4–7 days across Bangladesh.`} />
            <div className="mt-14 grid items-start gap-6 lg:grid-cols-[1.18fr_.82fr] lg:gap-8">
              {lastOrder ? <Confirmation order={lastOrder} /> : <OrderForm onOrder={setLastOrder} onDraftChange={setDraftForm} />}
              <OrderSummary order={lastOrder} draft={draftForm} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#53677D]">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#55E6E0]" /> Privacy-first checkout</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#55E6E0]" /> Bangladesh-wide delivery</span>
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#55E6E0]" /> Instant confirmation</span>
              <span className="sr-only">Current total {orderTotalLabel}</span>
            </div>
          </div>
        </section>
        <Preview />
        <About />
      </main>
      <Footer />
    </div>
  );
}