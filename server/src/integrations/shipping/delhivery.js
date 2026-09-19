import { commerce, hasKeys } from "../../commerce.config.js";
import { partnerFetch, PartnerError } from "../http.js";

// Delhivery B2C (express) API. Docs are in the Delhivery One dashboard → Developer → API docs.
const cfg = commerce.shipping.delhivery;
const { pickup, parcel: parcelDefaults } = commerce.shipping;
const NAME = "Delhivery";

const base = () => cfg.baseUrls[cfg.environment];
const headers = () => ({ Authorization: `Token ${cfg.keys.token}` });
const isCod = (order) => order.payment.method === "cod";

/** Maps Delhivery's StatusType / Status to our order status (null = no change). */
export function mapDelhiveryStatus(statusType, text) {
  const type = String(statusType ?? "").toUpperCase();
  const s = String(text ?? "").toUpperCase();
  if (type === "RT" || s.includes("RTO") || s.includes("RETURNED")) return "returned";
  if (type === "DL" || s === "DELIVERED") return "delivered";
  if (/(IN TRANSIT|PENDING|DISPATCHED|PICKED UP|OUT FOR DELIVERY)/.test(s)) return "shipped";
  return null;
}

export const delhivery = {
  id: "delhivery",
  label: cfg.label,
  isConfigured: () => hasKeys(cfg),

  /** Whether Delhivery delivers to the PIN code (and takes COD there), plus its surface rate when available. */
  async options(order, parcel) {
    const data = await partnerFetch(NAME, `${base()}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(order.address.pincode)}`, {
      headers: headers(),
    });
    const pin = data?.delivery_codes?.[0]?.postal_code;
    const prepaidOk = pin?.pre_paid === "Y";
    const codOk = pin?.cash === "Y";
    const serviceable = Boolean(pin) && (isCod(order) ? codOk : prepaidOk);

    let rate = 0;
    if (serviceable && pickup.postcode) {
      const params = new URLSearchParams({
        md: cfg.shippingMode === "Express" ? "E" : "S",
        ss: "Delivered",
        o_pin: pickup.postcode,
        d_pin: order.address.pincode,
        cgm: String(Math.round(parcel.weightKg * 1000)),
        pt: isCod(order) ? "COD" : "Pre-paid",
        cod: isCod(order) ? String(order.total) : "0",
      });
      const charges = await partnerFetch(NAME, `${base()}/api/kinko/v1/invoice/charges/.json?${params}`, { headers: headers() }).catch(() => null);
      rate = Number((Array.isArray(charges) ? charges[0] : charges)?.total_amount ?? 0);
    }

    return {
      serviceable,
      message: !pin ? "Delhivery does not deliver to this PIN code." : serviceable ? "" : "Delhivery does not take cash on delivery here.",
      couriers: serviceable ? [{ id: "", name: `Delhivery ${cfg.shippingMode}`, rate, etd: "", recommended: true }] : [],
    };
  },

  /** Books the shipment (manifest) — Delhivery assigns the waybill (AWB). */
  async createShipment(order, { parcel }) {
    const payload = {
      shipments: [
        {
          name: order.customer.name,
          add: [order.address.line1, order.address.line2].filter(Boolean).join(", "),
          pin: order.address.pincode,
          city: order.address.city,
          state: order.address.state,
          country: "India",
          phone: order.customer.phone,
          order: order.number,
          payment_mode: isCod(order) ? "COD" : "Prepaid",
          cod_amount: isCod(order) ? order.total : 0,
          total_amount: order.total,
          products_desc: order.lines.map((l) => `${l.name} ${l.sizeLabel} x${l.qty}`).join(", ").slice(0, 200),
          hsn_code: parcelDefaults.hsnCode,
          quantity: order.lines.reduce((n, l) => n + l.qty, 0),
          weight: Math.round(parcel.weightKg * 1000), // grams
          shipment_length: parcel.length,
          shipment_width: parcel.breadth,
          shipment_height: parcel.height,
          shipping_mode: cfg.shippingMode,
        },
      ],
      pickup_location: { name: pickup.name },
    };
    const data = await partnerFetch(NAME, `${base()}/api/cmu/create.json`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body: `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`,
    });
    const pkg = data?.packages?.[0];
    if (!data?.success || !pkg?.waybill) {
      const remark = Array.isArray(pkg?.remarks) ? pkg.remarks.join(" ") : pkg?.remarks;
      throw new PartnerError(NAME, remark || data?.rmk || "the shipment was not created.");
    }
    return {
      awb: String(pkg.waybill),
      courierName: "Delhivery",
      trackingUrl: cfg.trackingUrl(pkg.waybill),
      partnerOrderId: order.number,
      partnerShipmentId: String(pkg.refnum ?? ""),
      labelUrl: "",
    };
  },

  async track(order) {
    const data = await partnerFetch(NAME, `${base()}/api/v1/packages/json/?waybill=${encodeURIComponent(order.shipment.awb)}`, { headers: headers() });
    const status = data?.ShipmentData?.[0]?.Shipment?.Status ?? {};
    return { text: String(status.Status ?? ""), status: mapDelhiveryStatus(status.StatusType, status.Status) };
  },

  async cancel(order) {
    if (!order.shipment.awb) return;
    await partnerFetch(NAME, `${base()}/api/p/edit`, {
      method: "POST",
      headers: headers(),
      json: { waybill: order.shipment.awb, cancellation: "true" },
    });
  },
};
