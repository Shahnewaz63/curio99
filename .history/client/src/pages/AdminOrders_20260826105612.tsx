import { FormEvent, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatBangladeshDateTime } from "@/lib/time";
import { toast } from "sonner";

const statusOptions = [
  ["confirmation_pending", "Confirmation pending"],
  ["confirmed", "Confirmed"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled — customer / invalid info"],
] as const;

type StatusValue = (typeof statusOptions)[number][0];

function statusClasses(status: StatusValue) {
  if (status === "cancelled") return "border-[#F28773]/50 bg-[#F28773]/15 text-[#F6B1A4]";
  if (["processing", "shipped", "delivered"].includes(status)) return "border-[#56D695]/45 bg-[#56D695]/12 text-[#B7F5CB]";
  return "border-[#FFCF27]/45 bg-[#FFCF27]/12 text-[#F4E4A1]";
}

function statusLabel(status: string) {
  return statusOptions.find(([value]) => value === status)?.[1] ?? status;
}

export default function AdminOrders() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<StatusValue>("processing");
  const credentialConfiguration = trpc.auth.adminCredentialConfiguration.useQuery(undefined, { enabled: !user });
  const orders = trpc.orders.adminList.useQuery(undefined, { enabled: Boolean(user && user.role === "admin") });

  const refreshOrders = async () => {
    await utils.orders.adminList.invalidate();
  };

  const updateStatus = trpc.orders.adminUpdateStatus.useMutation({
    onSuccess: async () => { await refreshOrders(); toast.success("Order status updated and synchronized."); },
    onError: () => toast.error("The order status could not be updated."),
  });
  const bulkUpdateStatus = trpc.orders.adminBulkUpdateStatus.useMutation({
    onSuccess: async (_orders, variables) => {
      await refreshOrders();
      setSelectedIds([]);
      toast.success(`${variables.orderIds.length} order${variables.orderIds.length === 1 ? "" : "s"} updated and synchronized.`);
    },
    onError: () => toast.error("The selected order statuses could not be updated."),
  });
  const retrySheet = trpc.orders.adminRetrySheetSync.useMutation({
    onSuccess: async () => { await refreshOrders(); toast.success("Sheet synchronization retried."); },
    onError: () => toast.error("The sheet synchronization failed."),
  });
  const deleteOrder = trpc.orders.adminDeleteOrder.useMutation({
    onSuccess: async ({ orderId, sheetRowRemoved }) => {
      await refreshOrders();
      setSelectedIds(current => current.filter(id => id !== orderId));
      toast.success(sheetRowRemoved ? `Order ${orderId} and its Sheet1 row were deleted.` : `Order ${orderId} was deleted; no Sheet1 row was found.`);
    },
    onError: () => toast.error("The order was not deleted. Its customer record remains protected."),
  });
  const bulkDelete = trpc.orders.adminBulkDeleteOrders.useMutation({
    onSuccess: async ({ deletedOrderIds }) => {
      await refreshOrders();
      setSelectedIds([]);
      toast.success(`${deletedOrderIds.length} selected order${deletedOrderIds.length === 1 ? "" : "s"} deleted.`);
    },
    onError: () => toast.error("The selected orders were not deleted. Existing customer records remain protected."),
  });
  const credentialLogin = trpc.auth.adminCredentialLogin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Admin access granted.");
    },
    onError: () => toast.error("The administrator ID or password is incorrect."),
  });

  const submitCredentialLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    credentialLogin.mutate({ id: adminId, password: adminPassword });
  };

  const toggleOrder = (orderId: string) => {
    setSelectedIds(current => current.includes(orderId) ? current.filter(id => id !== orderId) : [...current, orderId]);
  };

  const toggleAll = () => {
    const visibleIds = orders.data?.map(order => order.orderId) ?? [];
    setSelectedIds(current => current.length === visibleIds.length ? [] : visibleIds);
  };

  const confirmDeletion = (orderId: string) => {
    if (window.confirm(`Delete ${orderId}? This permanently removes the order and its matching Sheet1 row.`)) {
      deleteOrder.mutate({ orderId });
    }
  };

  const confirmBulkDeletion = () => {
    if (selectedIds.length && window.confirm(`Delete ${selectedIds.length} selected orders? This permanently removes the selected records and their matching Sheet1 rows.`)) {
      bulkDelete.mutate({ orderIds: selectedIds });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#07111F]" />;
  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#07111F] p-6 text-[#F4F0E8]"><div className="w-full max-w-md border border-[#55E6E0]/30 bg-[#0D1B2D] p-8"><ShieldCheck className="h-8 w-8 text-[#55E6E0]" /><p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#55E6E0]">Private order desk</p><h1 className="mt-3 font-display text-3xl font-extrabold">Administrator sign-in</h1><p className="mt-3 leading-7 text-[#A7B5C5]">Enter the private administrator credentials to access customer orders and fulfilment tools.</p>{credentialConfiguration.data && !credentialConfiguration.data.configured && <div className="mt-6 border border-[#FFCF27]/35 bg-[#FFCF27]/[.08] p-4 text-sm leading-6 text-[#F4E4A1]">Local credentials are not configured. Create <code className="rounded bg-[#07111F]/65 px-1.5 py-0.5 text-[#F4F0E8]">.env.local</code> in the project root, set both admin values, then restart <code className="rounded bg-[#07111F]/65 px-1.5 py-0.5 text-[#F4F0E8]">pnpm dev</code>.</div>}<form onSubmit={submitCredentialLogin} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-[#F4F0E8]">Administrator ID<input value={adminId} onChange={event => setAdminId(event.target.value)} autoComplete="username" required disabled={credentialConfiguration.data?.configured === false} className="mt-2 w-full border border-white/[.16] bg-[#07111F] px-4 py-3 text-sm text-[#F4F0E8] outline-none transition focus:border-[#55E6E0] disabled:cursor-not-allowed disabled:opacity-50" /></label><label className="block text-sm font-semibold text-[#F4F0E8]">Password<input value={adminPassword} onChange={event => setAdminPassword(event.target.value)} type="password" autoComplete="current-password" required disabled={credentialConfiguration.data?.configured === false} className="mt-2 w-full border border-white/[.16] bg-[#07111F] px-4 py-3 text-sm text-[#F4F0E8] outline-none transition focus:border-[#55E6E0] disabled:cursor-not-allowed disabled:opacity-50" /></label><button type="submit" disabled={credentialLogin.isPending || credentialConfiguration.data?.configured === false} className="w-full bg-[#FFCF27] px-5 py-3 text-[11px] font-bold uppercase tracking-[.14em] text-[#07111F] transition hover:bg-[#F4F0E8] disabled:cursor-wait disabled:opacity-70">{credentialLogin.isPending ? "Checking access…" : "Open admin panel"}</button></form><a href="/" className="mt-6 inline-block text-sm font-semibold text-[#55E6E0]">Back to storefront</a></div></main>;
  if (user.role !== "admin") return <main className="flex min-h-screen items-center justify-center bg-[#07111F] p-6 text-[#F4F0E8]"><div className="max-w-md border border-[#F28773]/30 bg-[#0D1B2D] p-8"><AlertTriangle className="h-8 w-8 text-[#F28773]" /><h1 className="mt-5 font-display text-3xl font-extrabold">Owner access only</h1><p className="mt-3 leading-7 text-[#A7B5C5]">This orders dashboard is limited to the project owner.</p><a href="/" className="mt-7 inline-block text-sm font-semibold text-[#55E6E0]">Back to storefront</a></div></main>;

  const visibleOrders = orders.data ?? [];
  const allSelected = visibleOrders.length > 0 && selectedIds.length === visibleOrders.length;
  const isWorking = updateStatus.isPending || bulkUpdateStatus.isPending || deleteOrder.isPending || bulkDelete.isPending;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-2rem)] bg-[#07111F] p-5 text-[#F4F0E8] sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 border-b border-white/[.08] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#55E6E0]">Private order desk</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-.06em]">Orders</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#A7B5C5]">Select multiple orders to update fulfillment status or remove records together.</p>
            </div>
            <div className="flex items-center gap-3 border border-[#55E6E0]/25 bg-[#55E6E0]/[.06] px-4 py-3 text-xs text-[#B8FFFA]">
              <ShieldCheck className="h-4 w-4" /> Owner access verified
            </div>
          </div>

          {selectedIds.length > 0 && (
            <section className="mt-6 flex flex-col gap-3 border border-[#55E6E0]/30 bg-[#55E6E0]/[.06] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#B8FFFA]">{selectedIds.length} order{selectedIds.length === 1 ? "" : "s"} selected</p>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Bulk order status" value={bulkStatus} disabled={isWorking} onChange={event => setBulkStatus(event.target.value as StatusValue)} className="border border-[#55E6E0]/30 bg-[#07111F] px-3 py-2 text-xs font-semibold text-[#F4F0E8] focus:outline-none focus:ring-1 focus:ring-[#55E6E0]">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <button type="button" disabled={isWorking} onClick={() => bulkUpdateStatus.mutate({ orderIds: selectedIds, status: bulkStatus })} className="border border-[#56D695]/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#B7F5CB] transition hover:bg-[#56D695]/10 disabled:opacity-50">Set status</button>
                <button type="button" disabled={isWorking} onClick={confirmBulkDeletion} className="border border-[#F28773]/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#F6B1A4] transition hover:bg-[#F28773]/10 disabled:opacity-50">Delete selected</button>
              </div>
            </section>
          )}

          {orders.isLoading && <p className="py-12 text-sm text-[#A7B5C5]">Loading orders…</p>}
          {orders.error && <div className="mt-8 border border-[#F28773]/30 bg-[#F28773]/[.08] p-5 text-[#F6B1A4]">Orders could not be loaded. Only the configured owner account can access this page.</div>}
          {orders.data && (
            <div className="mt-8 overflow-hidden border border-white/[.1] bg-[#0D1B2D]">
              <div className="overflow-x-auto">
                <table className="min-w-[1160px] w-full text-left text-sm">
                  <thead className="border-b border-white/[.08] bg-white/[.025] text-[10px] uppercase tracking-[.13em] text-[#71869C]">
                    <tr>
                      <th className="w-12 px-4 py-4"><input aria-label="Select all displayed orders" type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#55E6E0]" /></th>
                      <th className="px-5 py-4">Order</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Delivery</th>
                      <th className="px-5 py-4">Total</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Sheet</th>
                      <th className="px-5 py-4">Placed (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map(order => (
                      <tr key={order.orderId} className={selectedIds.includes(order.orderId) ? "border-b border-[#55E6E0]/20 bg-[#55E6E0]/[.035] align-top last:border-b-0" : "border-b border-white/[.06] align-top last:border-b-0"}>
                        <td className="px-4 py-5"><input aria-label={`Select ${order.orderId}`} type="checkbox" checked={selectedIds.includes(order.orderId)} onChange={() => toggleOrder(order.orderId)} className="h-4 w-4 accent-[#55E6E0]" /></td>
                        <td className="px-5 py-5">
                          <p className="font-display font-extrabold text-[#F4F0E8]">#{order.orderId}</p>
                          <p className="mt-1 text-xs text-[#71869C]">{order.paymentMethod.toUpperCase()} · {order.paymentStatus}</p>
                          <button type="button" disabled={isWorking} onClick={() => confirmDeletion(order.orderId)} className="mt-3 inline-flex items-center gap-2 border border-[#F28773]/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#F6B1A4] transition hover:bg-[#F28773]/10 disabled:cursor-wait disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                        </td>
                        
                        {/* Updated Customer Column */}
                        <td className="px-5 py-5">
                          <p className="font-semibold text-[#F4F0E8]">{order.fullName}</p>
                          {(order.email || (order as any).customerEmail) && (
                            <p className="mt-1 text-xs text-[#55E6E0]">
                              {order.email || (order as any).customerEmail}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-[#A7B5C5]">{order.phone}</p>
                          <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#71869C]">{order.address}</p>
                        </td>

                        <td className="px-5 py-5 text-xs leading-5 text-[#A7B5C5]">{order.deliveryLocation === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"}<br />{order.quantity} copy{order.quantity > 1 ? "ies" : ""}</td>
                        <td className="px-5 py-5 font-display font-extrabold text-[#55E6E0]">৳{order.total.toLocaleString("en-BD")}</td>
                        <td className="px-5 py-5"><span className={`inline-flex border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] ${statusClasses(order.status as StatusValue)}`}>{statusLabel(order.status)}</span><select aria-label={`Status for ${order.orderId}`} value={order.status} disabled={isWorking} onChange={event => updateStatus.mutate({ orderId: order.orderId, status: event.target.value as StatusValue })} className="mt-3 block border border-[#55E6E0]/25 bg-[#07111F] px-3 py-2 text-xs font-semibold text-[#F4F0E8] focus:outline-none focus:ring-1 focus:ring-[#55E6E0]">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                        <td className="px-5 py-5"><div className="flex items-center gap-2 text-xs"><span className={order.sheetSyncState === "synced" ? "text-[#B8FFFA]" : order.sheetSyncState === "failed" ? "text-[#F6B1A4]" : "text-[#FFCF27]"}>{order.sheetSyncState === "synced" ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}</span><span className="capitalize text-[#A7B5C5]">{order.sheetSyncState}</span></div>{order.sheetSyncState === "failed" && <button type="button" onClick={() => retrySheet.mutate({ orderId: order.orderId })} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#55E6E0]"><RefreshCw className="h-3 w-3" /> Retry</button>}</td>
                        <td className="px-5 py-5 text-xs text-[#71869C]">{formatBangladeshDateTime(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleOrders.length === 0 && <div className="p-12 text-center text-sm text-[#71869C]">No orders have been placed yet.</div>}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}