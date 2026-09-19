import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { fieldClass, labelClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { sized } from "@/lib/images";
import type { OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import {
  adminCommerceApi,
  type AdminOrder,
  type Parcel,
  type PartnerChoice,
  type ShippingOptions,
  type ShippingPartnerId,
} from "../adminApi";
import { Card, formatDateTime, isUnauthorized, messageOf, methodLabel, NoticeBanner, paymentSummary, StatusBadge, useNotice } from "../ui";

type Detail = { order: AdminOrder; partners: PartnerChoice[]; defaultPartner: ShippingPartnerId; defaultParcel: Parcel };

export default function AdminOrderDetail() {
  const { id = "" } = useParams();
  const { guard, can } = useAdminAuth();
  const canUpdate = can("orders.update");
  const canDelete = can("orders.delete");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useNotice();
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState<"" | "accept" | "cancel" | "ship">("");
  const closeDialog = useCallback(() => setDialog(""), []);

  const load = useCallback(async () => {
    try {
      setDetail(await guard(adminCommerceApi.getOrder(id)));
      setLoadError("");
    } catch (err) {
      if (!isUnauthorized(err)) setLoadError(messageOf(err, "Could not load this order."));
    }
  }, [guard, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (detail) document.title = `${detail.order.number} — Azelle admin`;
  }, [detail]);

  /** Runs an order action, swaps in the updated order and shows the outcome. */
  const run = async (key: string, action: () => Promise<{ order: AdminOrder; warnings?: string[] }>, success: string) => {
    setBusy(key);
    try {
      const { order, warnings } = await guard(action());
      setDetail((d) => (d ? { ...d, order } : d));
      setNotice(warnings?.length ? { tone: "error", text: `${success} ${warnings.join(" ")}` } : { tone: "success", text: success });
      setDialog("");
      return true;
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "That didn't work. Please try again.") });
      return false;
    } finally {
      setBusy("");
    }
  };

  if (loadError) {
    return (
      <div className="py-20 text-center">
        <p>{loadError}</p>
        <Link to="/admin/orders" className="abtn abtn-add mt-6">
          Back to orders
        </Link>
      </div>
    );
  }
  if (!detail) return <p className="py-20 text-center text-sm" role="status">Loading order…</p>;

  const { order } = detail;
  const hasPartnerShipment = (order.shipment.partner === "shiprocket" || order.shipment.partner === "delhivery") && Boolean(order.shipment.awb);
  const paidOnline = order.payment.method !== "cod" && order.payment.status === "paid";
  const canCancel = !["cancelled", "delivered", "returned"].includes(order.status);

  const actions: ReactNode[] = [];
  if (canUpdate && order.status === "pending") {
    actions.push(
      <button key="accept" type="button" className="abtn abtn-add !h-11 !px-5" onClick={() => setDialog("accept")}>
        Accept order
      </button>,
    );
  }
  if (canUpdate && order.status === "awaiting_payment" || order.status === "payment_failed") {
    actions.push(
      <button key="sync" type="button" className="abtn abtn-ghost !h-11" disabled={busy === "sync"} onClick={() => void run("sync", () => adminCommerceApi.syncPayment(order.id), "Payment status checked with the gateway.")}>
        {busy === "sync" ? "Checking…" : "Check payment status"}
      </button>,
    );
  }
  if (canUpdate && order.status === "accepted") {
    actions.push(
      <button key="ship" type="button" className="abtn abtn-add !h-11 !px-5" onClick={() => setDialog("ship")}>
        Mark as shipped
      </button>,
    );
  }
  if (canUpdate && order.status === "shipped") {
    actions.push(
      <button key="deliver" type="button" className="abtn abtn-add !h-11 !px-5" disabled={busy === "deliver"} onClick={() => void run("deliver", () => adminCommerceApi.setStatus(order.id, "delivered"), "Marked as delivered.")}>
        Mark as delivered
      </button>,
    );
  }
  if (canUpdate && hasPartnerShipment && ["accepted", "shipped"].includes(order.status)) {
    actions.push(
      <button key="track" type="button" className="abtn abtn-edit !h-11" disabled={busy === "track"} onClick={() => void run("track", () => adminCommerceApi.track(order.id), "Tracking refreshed.")}>
        {busy === "track" ? "Refreshing…" : "Refresh tracking"}
      </button>,
    );
  }
  if (canUpdate && ["shipped", "delivered"].includes(order.status)) {
    actions.push(
      <button key="return" type="button" className="abtn abtn-ghost !h-11" disabled={busy === "return"} onClick={() => void run("return", () => adminCommerceApi.setStatus(order.id, "returned"), "Marked as returned.")}>
        Mark as returned
      </button>,
    );
  }
  if (canDelete && paidOnline && ["cancelled", "returned"].includes(order.status)) {
    actions.push(
      <button key="refund" type="button" className="abtn abtn-add !h-11" disabled={busy === "refund"} onClick={() => void run("refund", () => adminCommerceApi.refund(order.id), "Refund started.")}>
        {busy === "refund" ? "Refunding…" : `Refund ${formatPrice(order.total)}`}
      </button>,
    );
  }
  if (canDelete && canCancel) {
    actions.push(
      <button key="cancel" type="button" className="abtn abtn-delete !h-11" onClick={() => setDialog("cancel")}>
        Cancel order
      </button>,
    );
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-link text-sm">
        ← All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="admin-title font-display text-[2.4rem] leading-none md:text-[2.9rem]">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm">
        Placed {formatDateTime(order.createdAt)} · {paymentSummary(order.payment)}
      </p>

      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      {actions.length > 0 && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      {order.status === "pending" && (
        <p className="mt-3 text-sm text-soft">The customer sees this order as “Pending” until you accept it and choose a shipping partner.</p>
      )}

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title={`Items (${order.lines.reduce((n, l) => n + l.qty, 0)})`}>
            <ul className="divide-y divide-line">
              {order.lines.map((l) => (
                <li key={`${l.productId}-${l.sizeId}`} className="flex items-center gap-4 py-3">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
                    {l.image && <img src={sized(l.image, 120)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="text-sm">
                      {l.sizeLabel} · {formatPrice(l.unit)} × {l.qty}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(l.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              {order.discount > 0 && <Row label={`Discount (${order.couponCode})`} value={`−${formatPrice(order.discount)}`} />}
              {order.couponCode && order.discount === 0 && <Row label="Coupon" value={`${order.couponCode} (free shipping)`} />}
              <Row label="Shipping" value={order.shipping ? formatPrice(order.shipping) : "Free"} />
              <Row label="GST" value={formatPrice(order.tax)} />
              {order.codFee > 0 && <Row label="COD fee" value={formatPrice(order.codFee)} />}
            </dl>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </Card>

          <Card title="Timeline">
            <ol className="space-y-3">
              {[...order.history].reverse().map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: e.status ? "var(--accent)" : "var(--line)" }} aria-hidden="true" />
                  <span>
                    <span className="block">{e.note || (e.status ? `Status: ${e.status}` : "Update")}</span>
                    <span className="text-[12.5px] text-soft">
                      {formatDateTime(e.at)} · {e.by}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <NoteCard order={order} readOnly={!canUpdate} onSave={(note) => run("note", () => adminCommerceApi.saveNote(order.id, note), "Note saved.")} saving={busy === "note"} />
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <p className="font-semibold">{order.customer.name}</p>
            <p className="mt-1 break-all text-sm">
              <a href={`mailto:${order.customer.email}`} className="text-link">
                {order.customer.email}
              </a>
            </p>
            <p className="text-sm">
              <a href={`tel:+91${order.customer.phone}`} className="text-link">
                +91 {order.customer.phone}
              </a>
            </p>
            <Link to={`/admin/orders?email=${encodeURIComponent(order.customer.email)}`} className="text-link mt-3 inline-block text-sm font-semibold">
              All orders from this customer →
            </Link>
          </Card>

          <Card title="Delivery address">
            <address className="text-sm not-italic leading-relaxed">
              {order.customer.name}
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              India
            </address>
          </Card>

          <Card title="Payment">
            <dl className="space-y-1.5 text-sm">
              <Row label="Method" value={methodLabel(order.payment.method)} />
              <Row label="Status" value={paymentSummary(order.payment)} />
              {order.payment.gatewayOrderId && <Row label="Gateway order" value={order.payment.gatewayOrderId} />}
              {order.payment.paymentId && <Row label="Payment ID" value={order.payment.paymentId} />}
              {order.payment.paidAt && <Row label="Paid" value={formatDateTime(order.payment.paidAt)} />}
              {order.payment.refundId && <Row label="Refund ID" value={order.payment.refundId} />}
            </dl>
          </Card>

          <Card title="Shipment">
            {order.shipment.partner ? (
              <dl className="space-y-1.5 text-sm">
                <Row label="Partner" value={partnerName(order.shipment.partner)} />
                {order.shipment.courierName && <Row label="Courier" value={order.shipment.courierName} />}
                <Row label="AWB" value={order.shipment.awb || "—"} />
                {order.shipment.weightKg > 0 && <Row label="Weight" value={`${order.shipment.weightKg} kg`} />}
                {order.shipment.lastStatus && <Row label="Courier status" value={order.shipment.lastStatus} />}
                {order.shipment.lastSyncedAt && <Row label="Checked" value={formatDateTime(order.shipment.lastSyncedAt)} />}
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                  {order.shipment.trackingUrl && (
                    <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer noopener" className="text-link font-semibold">
                      Tracking page ↗
                    </a>
                  )}
                  {order.shipment.labelUrl && (
                    <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer noopener" className="text-link font-semibold">
                      Shipping label ↗
                    </a>
                  )}
                </div>
              </dl>
            ) : (
              <p className="text-sm">Not booked yet. Accept the order to choose a shipping partner.</p>
            )}
          </Card>
        </div>
      </div>

      <AcceptDialog
        open={dialog === "accept"}
        onClose={closeDialog}
        detail={detail}
        busy={busy === "accept"}
        loadOptions={(parcel) => guard(adminCommerceApi.shippingOptions(order.id, parcel))}
        onAccept={(input) => run("accept", () => adminCommerceApi.accept(order.id, input), "Order accepted — the customer now sees it as Accepted.")}
      />
      <CancelDialog
        open={dialog === "cancel"}
        onClose={closeDialog}
        busy={busy === "cancel"}
        canRefund={paidOnline}
        total={order.total}
        onConfirm={(reason, refund) => run("cancel", () => adminCommerceApi.cancel(order.id, reason, refund), "Order cancelled.")}
      />
      <ShipDialog
        open={dialog === "ship"}
        onClose={closeDialog}
        busy={busy === "ship"}
        needsAwb={!order.shipment.awb}
        onConfirm={(awb) => run("ship", () => adminCommerceApi.setStatus(order.id, "shipped" as OrderStatus, awb ? { awb } : {}), "Marked as shipped.")}
      />
    </div>
  );
}

const partnerName = (id: string) => ({ shiprocket: "Shiprocket", delhivery: "Delhivery", manual: "Manual" })[id] ?? id;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-soft">{label}</dt>
      <dd className="break-all text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function NoteCard({ order, onSave, saving, readOnly }: { order: AdminOrder; onSave: (note: string) => Promise<boolean>; saving: boolean; readOnly: boolean }) {
  const [note, setNote] = useState(order.adminNote);
  useEffect(() => setNote(order.adminNote), [order.adminNote]);
  return (
    <Card title="Internal note">
      <label htmlFor="admin-note" className="sr-only">
        Internal note (not shown to the customer)
      </label>
      <textarea id="admin-note" readOnly={readOnly} value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${fieldClass} !mt-0 h-auto py-3`} placeholder="Only visible to admins" />
      <button type="button" className="abtn abtn-edit mt-3" disabled={readOnly || saving || note === order.adminNote} onClick={() => void onSave(note)}>
        {saving ? "Saving…" : "Save note"}
      </button>
    </Card>
  );
}

// ── Accept: choose the shipping partner (and courier), confirm the parcel, book ─────────────
function AcceptDialog({
  open,
  onClose,
  detail,
  busy,
  loadOptions,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  detail: Detail;
  busy: boolean;
  loadOptions: (parcel: Parcel) => Promise<ShippingOptions>;
  onAccept: (input: Parameters<typeof adminCommerceApi.accept>[1]) => Promise<boolean>;
}) {
  const configured = detail.partners.filter((p) => p.configured && p.id !== "manual");
  const initialPartner = configured.find((p) => p.id === detail.defaultPartner)?.id ?? configured[0]?.id ?? "manual";
  const [partner, setPartner] = useState<ShippingPartnerId>(initialPartner);
  const [parcel, setParcel] = useState<Parcel>(detail.defaultParcel);
  const [options, setOptions] = useState<ShippingOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [checking, setChecking] = useState(false);
  const [courierId, setCourierId] = useState("");
  const [manual, setManual] = useState({ courierName: "", awb: "", trackingUrl: "" });
  const [error, setError] = useState("");

  const check = useCallback(
    async (p: Parcel) => {
      if (configured.length === 0) return;
      setChecking(true);
      setOptionsError("");
      try {
        setOptions(await loadOptions(p));
      } catch (err) {
        setOptionsError(messageOf(err, "Couldn't load courier options."));
      } finally {
        setChecking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadOptions, configured.length],
  );

  // Fresh state and a courier check every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setPartner(initialPartner);
    setParcel(detail.defaultParcel);
    setOptions(null);
    setCourierId("");
    setError("");
    void check(detail.defaultParcel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = options?.options.find((o) => o.partner === partner);

  const submit = async () => {
    setError("");
    if (partner === "manual" && (!manual.courierName.trim() || !manual.awb.trim())) {
      setError("Enter the courier name and AWB / tracking number.");
      return;
    }
    await onAccept({
      partner,
      parcel,
      ...(partner === "shiprocket" && courierId ? { courierId } : {}),
      ...(partner === "manual" ? { manual } : {}),
    });
  };

  const num = (key: keyof Parcel) => (e: ChangeEvent<HTMLInputElement>) => setParcel((p) => ({ ...p, [key]: Number(e.target.value) }));

  return (
    <Modal open={open} onClose={onClose} label="Accept order" panelClassName="max-w-[640px]">
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 md:p-8">
        <h2 className="font-display text-3xl">Accept {detail.order.number}</h2>
        <p className="mt-2 text-sm">
          Choose how this order ships to {detail.order.address.city} {detail.order.address.pincode}
          {detail.order.payment.method === "cod" ? ` — cash on delivery, ${formatPrice(detail.order.total)} to collect.` : " — prepaid."}
        </p>

        <fieldset className="mt-6">
          <legend className={labelClass}>Shipping partner</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {detail.partners.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer flex-col rounded-[12px] border p-3 text-sm ${partner === p.id ? "border-ink bg-surface2" : "border-line"} ${p.configured ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="partner" checked={partner === p.id} disabled={!p.configured} onChange={() => setPartner(p.id)} />
                  {p.id === "manual" ? "Manual" : p.label}
                </span>
                <span className="mt-1 text-[12.5px] text-soft">
                  {!p.configured ? "Not configured — add keys (Settings)" : p.id === "manual" ? "Enter courier + AWB yourself" : "Book via API"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>Parcel</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["weightKg", "Weight (kg)", 0.05],
                ["length", "Length (cm)", 1],
                ["breadth", "Breadth (cm)", 1],
                ["height", "Height (cm)", 1],
              ] as const
            ).map(([key, label, step]) => (
              <div key={key}>
                <label htmlFor={`parcel-${key}`} className="text-[12px] font-semibold">
                  {label}
                </label>
                <input id={`parcel-${key}`} type="number" min={step} step={step} value={parcel[key]} onChange={num(key)} className={`${fieldClass} !mt-1 !h-11`} />
              </div>
            ))}
          </div>
          {configured.length > 0 && (
            <button type="button" className="text-link mt-3 text-sm font-semibold" onClick={() => void check(parcel)} disabled={checking}>
              {checking ? "Checking couriers…" : "Re-check couriers & rates"}
            </button>
          )}
        </fieldset>

        {partner !== "manual" && (
          <div className="mt-6 rounded-[14px] border border-line p-4">
            {checking && !options ? (
              <p className="text-sm" role="status">
                Checking couriers…
              </p>
            ) : optionsError ? (
              <p className="text-sm text-[#b3261e]">{optionsError}</p>
            ) : current ? (
              !current.serviceable ? (
                <p className="text-sm text-[#b3261e]">{current.message || "Not serviceable for this PIN code."}</p>
              ) : partner === "shiprocket" ? (
                <fieldset>
                  <legend className="text-sm font-semibold">Courier</legend>
                  <div className="mt-2 max-h-[220px] space-y-1.5 overflow-y-auto">
                    <CourierRow checked={courierId === ""} onSelect={() => setCourierId("")} name="Let Shiprocket choose (recommended)" />
                    {current.couriers.map((c) => (
                      <CourierRow
                        key={c.id}
                        checked={courierId === c.id}
                        onSelect={() => setCourierId(c.id)}
                        name={`${c.name}${c.recommended ? " ★" : ""}`}
                        detail={`${formatPrice(c.rate)}${c.etd ? ` · ${c.etd}` : ""}`}
                      />
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="text-sm">
                  Delhivery delivers here{current.couriers[0]?.rate ? ` · about ${formatPrice(current.couriers[0].rate)}` : ""}.
                </p>
              )
            ) : (
              <p className="text-sm">Courier options appear here.</p>
            )}
          </div>
        )}

        {partner === "manual" && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="manual-courier" className="text-[12px] font-semibold">
                Courier name
              </label>
              <input id="manual-courier" value={manual.courierName} onChange={(e) => setManual((m) => ({ ...m, courierName: e.target.value }))} className={`${fieldClass} !mt-1 !h-11`} placeholder="e.g. DTDC" />
            </div>
            <div>
              <label htmlFor="manual-awb" className="text-[12px] font-semibold">
                AWB / tracking number
              </label>
              <input id="manual-awb" value={manual.awb} onChange={(e) => setManual((m) => ({ ...m, awb: e.target.value }))} className={`${fieldClass} !mt-1 !h-11`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="manual-url" className="text-[12px] font-semibold">
                Tracking link (optional)
              </label>
              <input id="manual-url" type="url" value={manual.trackingUrl} onChange={(e) => setManual((m) => ({ ...m, trackingUrl: e.target.value }))} className={`${fieldClass} !mt-1 !h-11`} placeholder="https://" />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" className="abtn abtn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="abtn abtn-add" onClick={() => void submit()} disabled={busy || (partner !== "manual" && current?.serviceable === false)}>
            {busy ? "Booking…" : partner === "manual" ? "Accept order" : "Accept & book shipment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CourierRow({ checked, onSelect, name, detail }: { checked: boolean; onSelect: () => void; name: string; detail?: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2 text-sm ${checked ? "border-ink bg-surface2" : "border-line"}`}>
      <input type="radio" name="courier" checked={checked} onChange={onSelect} />
      <span className="flex-1">{name}</span>
      {detail && <span className="tabular-nums text-soft">{detail}</span>}
    </label>
  );
}

function CancelDialog({
  open,
  onClose,
  busy,
  canRefund,
  total,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  canRefund: boolean;
  total: number;
  onConfirm: (reason: string, refund: boolean) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(true);
  useEffect(() => {
    if (open) {
      setReason("");
      setRefund(true);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} label="Cancel order">
      <div className="p-7 md:p-8">
        <h2 className="font-display text-3xl">Cancel this order?</h2>
        <p className="mt-2 text-sm">Any booked shipment is cancelled with the partner. The reason is shown to the customer.</p>
        <label htmlFor="cancel-reason" className={`${labelClass} mt-5`}>
          Reason
        </label>
        <textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${fieldClass} h-auto py-3`} placeholder="e.g. Out of stock — a full refund has been issued." />
        {canRefund && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
            Refund {formatPrice(total)} to the customer now
          </label>
        )}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" className="abtn abtn-ghost" onClick={onClose}>
            Keep order
          </button>
          <button type="button" className="abtn abtn-delete" disabled={busy || !reason.trim()} onClick={() => void onConfirm(reason.trim(), canRefund && refund)}>
            {busy ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ShipDialog({ open, onClose, busy, needsAwb, onConfirm }: { open: boolean; onClose: () => void; busy: boolean; needsAwb: boolean; onConfirm: (awb: string) => Promise<boolean> }) {
  const [awb, setAwb] = useState("");
  useEffect(() => {
    if (open) setAwb("");
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} label="Mark as shipped">
      <div className="p-7 md:p-8">
        <h2 className="font-display text-3xl">Mark as shipped?</h2>
        <p className="mt-2 text-sm">Use this once the courier has picked up the parcel. The customer sees “Shipped” with the tracking details.</p>
        {needsAwb && (
          <>
            <label htmlFor="ship-awb" className={`${labelClass} mt-5`}>
              AWB / tracking number
            </label>
            <input id="ship-awb" value={awb} onChange={(e) => setAwb(e.target.value)} className={fieldClass} />
          </>
        )}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" className="abtn abtn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="abtn abtn-add" disabled={busy || (needsAwb && !awb.trim())} onClick={() => void onConfirm(awb.trim())}>
            {busy ? "Saving…" : "Mark as shipped"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
