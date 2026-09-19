import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminCommerceApi, type Settings } from "../adminApi";
import { Card, isUnauthorized, messageOf, PageHeader } from "../ui";

// Read-only view of server/src/commerce.config.js plus which partner keys are set.
export default function AdminSettings() {
  const { guard } = useAdminAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Settings — Azelle admin";
    guard(adminCommerceApi.settings()).then(setSettings, (err) => {
      if (!isUnauthorized(err)) setError(messageOf(err, "Could not load settings."));
    });
  }, [guard]);

  if (error) return <p className="py-20 text-center">{error}</p>;
  if (!settings) return <p className="py-20 text-center text-sm" role="status">Loading settings…</p>;

  const { store, payments, cod, shipping, analytics } = settings;

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle={
          <>
            These values live in <code className="rounded bg-surface2 px-1.5 py-0.5 text-[13px]">server/src/commerce.config.js</code>. Partner keys are set as environment variables
            (server/.env locally, Vercel → Settings → Environment Variables in production) — never in the code.
          </>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card title="Payment gateways">
          <p className="mb-4 text-sm">Customers paying online use the first configured gateway; if it can't start a payment, the next one is used.</p>
          <ul className="space-y-4">
            {payments.map((p, i) => (
              <li key={p.id} className="rounded-[14px] border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {i + 1}. {p.label} <span className="text-sm font-normal text-soft">({i === 0 ? "primary" : "backup"})</span>
                  </p>
                  <StatusPill ok={p.configured} okText={`Connected · ${p.environment || "—"}`} offText="Not connected" />
                </div>
                {p.missing.length > 0 && <Missing names={p.missing} />}
                <p className="mt-3 text-[13px]">
                  Webhook URL:{" "}
                  <code className="break-all rounded bg-surface2 px-1.5 py-0.5">{p.webhookUrl}</code>
                </p>
                {p.configured && !p.webhookReady && <p className="mt-1 text-[13px] text-[#8c1d18]">Set the webhook secret so payments confirm even if the customer closes the page.</p>}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-[14px] border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{cod.label}</p>
              <StatusPill ok={cod.enabled} okText="On" offText="Off" />
            </div>
            <p className="mt-1 text-sm">
              Orders up to {formatPrice(cod.maxOrderValue)} · extra fee {cod.fee ? formatPrice(cod.fee) : "none"}
            </p>
          </div>
        </Card>

        <Card title="Shipping partners">
          <p className="mb-4 text-sm">You choose the partner for each order when you accept it. “Manual” is always available.</p>
          <ul className="space-y-4">
            {shipping.partners.map((p) => (
              <li key={p.id} className="rounded-[14px] border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {p.label} {shipping.defaultPartner === p.id && <span className="text-sm font-normal text-soft">(pre-selected)</span>}
                  </p>
                  <StatusPill ok={p.configured} okText={`Connected · ${p.environment}`} offText="Not connected" />
                </div>
                {p.missing.length > 0 && <Missing names={p.missing} />}
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Pickup location name" value={shipping.pickup.name} />
            <Row label="Pickup PIN code" value={shipping.pickup.postcode || "Not set (PICKUP_PINCODE)"} />
            <Row label="Box size" value={`${shipping.parcel.dimensionsCm.length} × ${shipping.parcel.dimensionsCm.breadth} × ${shipping.parcel.dimensionsCm.height} cm`} />
            <Row
              label="Bottle weights"
              value={Object.entries(shipping.parcel.weightPerSizeKg)
                .map(([size, kg]) => `${size} ml ${kg} kg`)
                .join(" · ")}
            />
            <Row label="Packaging" value={`${shipping.parcel.packagingKg} kg`} />
            <Row label="HSN code" value={shipping.parcel.hsnCode} />
          </dl>
        </Card>

        <Card title="Website analytics">
          <div className="rounded-[14px] border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{analytics.label}</p>
              <StatusPill ok={analytics.configured} okText={`Connected · ${analytics.environment}`} offText="Not connected" />
            </div>
            {analytics.missing.length > 0 && <Missing names={analytics.missing} />}
            <p className="mt-2 text-sm">
              Tracks visits, heatmaps and recordings on the store (never the admin). Dashboard figures refresh every {analytics.refreshHours} hours.
            </p>
          </div>
        </Card>

        <Card title="Store charges">
          <dl className="space-y-1.5 text-sm">
            <Row label="GST" value={`${Math.round(store.gstRate * 100)}% on the price after discount`} />
            <Row label="Shipping" value={`${formatPrice(store.shippingFee)} flat per order`} />
            <Row label="Max per item" value={`${store.maxQtyPerLine} per product size`} />
            <Row label="Site URL (payment returns)" value={store.siteUrl} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function StatusPill({ ok, okText, offText }: { ok: boolean; okText: string; offText: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${ok ? "bg-[#dcefe2] text-[#1f6a3c]" : "bg-[#ece8e1] text-[#5b5249]"}`}>
      {ok ? "✓ " : ""}
      {ok ? okText : offText}
    </span>
  );
}

function Missing({ names }: { names: string[] }) {
  return (
    <p className="mt-2 text-[13px]">
      Add:{" "}
      {names.map((n, i) => (
        <span key={n}>
          <code className="rounded bg-surface2 px-1.5 py-0.5">{n}</code>
          {i < names.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-soft">{label}</dt>
      <dd className="break-all text-right font-medium">{value}</dd>
    </div>
  );
}
