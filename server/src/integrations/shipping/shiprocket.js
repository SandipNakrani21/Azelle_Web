import { commerce, hasKeys } from "../../commerce.config.js";
import { partnerFetch, PartnerError } from "../http.js";

// Shiprocket (aggregator). Docs: https://apidocs.shiprocket.in/
const cfg = commerce.shipping.shiprocket;
const { pickup, parcel: parcelDefaults } = commerce.shipping;
const NAME = "Shiprocket";

// Login tokens last 10 days; refresh a day early. Kept in memory (a cold start simply logs in again).
let token = { value: "", expiresAt: 0 };

async function authHeaders() {
  if (!token.value || Date.now() > token.expiresAt) {
    const data = await partnerFetch(NAME, `${cfg.baseUrl}/auth/login`, {
      method: "POST",
      json: { email: cfg.keys.email, password: cfg.keys.password },
    });
    if (!data?.token) throw new PartnerError(NAME, "login failed — check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.");
    token = { value: data.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  }
  return { Authorization: `Bearer ${token.value}` };
}

async function call(path, options = {}) {
  try {
    return await partnerFetch(NAME, `${cfg.baseUrl}${path}`, { ...options, headers: await authHeaders() });
  } catch (err) {
    // An expired or revoked token: log in once more and retry.
    if (err instanceof PartnerError && /token|unauth/i.test(err.message)) {
      token = { value: "", expiresAt: 0 };
      return partnerFetch(NAME, `${cfg.baseUrl}${path}`, { ...options, headers: await authHeaders() });
    }
    throw err;
  }
}

const pad = (n) => String(n).padStart(2, "0");
const orderDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isCod = (order) => order.payment.method === "cod";

/** Maps Shiprocket's status text to our order status (null = no change). */
export function mapShiprocketStatus(text) {
  const s = String(text ?? "").toUpperCase();
  if (!s) return null;
  if (s.includes("RTO")) return "returned";
  if (s.includes("DELIVERED")) return "delivered";
  if (/(PICKED|IN TRANSIT|SHIPPED|OUT FOR DELIVERY|REACHED|DISPATCHED)/.test(s)) return "shipped";
  return null;
}

export const shiprocket = {
  id: "shiprocket",
  label: cfg.label,
  isConfigured: () => hasKeys(cfg),

  /** Couriers that can take this parcel, with Shiprocket's rate and estimated delivery. */
  async options(order, parcel) {
    if (!pickup.postcode) throw new PartnerError(NAME, "set PICKUP_PINCODE to check couriers.", { status: 400 });
    const params = new URLSearchParams({
      pickup_postcode: pickup.postcode,
      delivery_postcode: order.address.pincode,
      weight: String(parcel.weightKg),
      cod: isCod(order) ? "1" : "0",
      declared_value: String(order.total),
    });
    const data = await call(`/courier/serviceability/?${params}`);
    const couriers = data?.data?.available_courier_companies ?? [];
    const recommended = data?.data?.recommended_courier_company_id;
    return {
      serviceable: couriers.length > 0,
      couriers: couriers
        .map((c) => ({
          id: String(c.courier_company_id),
          name: c.courier_name,
          rate: Number(c.rate ?? c.freight_charge ?? 0),
          etd: c.etd || (c.estimated_delivery_days ? `${c.estimated_delivery_days} days` : ""),
          recommended: c.courier_company_id === recommended,
        }))
        .sort((a, b) => a.rate - b.rate),
    };
  },

  /** Creates the Shiprocket order, assigns an AWB (chosen courier or Shiprocket's pick) and requests pickup. */
  async createShipment(order, { parcel, courierId }) {
    const [firstName, ...rest] = order.customer.name.split(" ");
    const created = await call("/orders/create/adhoc", {
      method: "POST",
      json: {
        order_id: order.number,
        order_date: orderDate(order.createdAt),
        pickup_location: pickup.name,
        billing_customer_name: firstName,
        billing_last_name: rest.join(" ") || firstName,
        billing_address: order.address.line1,
        billing_address_2: order.address.line2,
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: "India",
        billing_email: order.customer.email,
        billing_phone: order.customer.phone,
        shipping_is_billing: true,
        order_items: order.lines.map((l) => ({
          name: `${l.name} ${l.sizeLabel}`,
          sku: `${l.slug || l.productId}-${l.sizeId}`,
          units: l.qty,
          selling_price: l.unit,
          hsn: parcelDefaults.hsnCode,
        })),
        payment_method: isCod(order) ? "COD" : "Prepaid",
        shipping_charges: order.shipping,
        total_discount: order.discount,
        sub_total: order.total,
        length: parcel.length,
        breadth: parcel.breadth,
        height: parcel.height,
        weight: parcel.weightKg,
      },
    });
    const shipmentId = created?.shipment_id;
    if (!shipmentId) throw new PartnerError(NAME, created?.message || "the order was not created.");

    const assigned = await call("/courier/assign/awb", {
      method: "POST",
      json: { shipment_id: shipmentId, ...(courierId ? { courier_id: Number(courierId) } : {}) },
    });
    const awbData = assigned?.response?.data;
    if (!awbData?.awb_code) {
      throw new PartnerError(NAME, awbData?.awb_assign_error || assigned?.message || "no AWB could be assigned — try another courier.");
    }

    // Pickup and label are conveniences: a failure here doesn't undo the booked shipment.
    await call("/courier/generate/pickup", { method: "POST", json: { shipment_id: [shipmentId] } }).catch(() => null);
    const label = await call("/courier/generate/label", { method: "POST", json: { shipment_id: [shipmentId] } }).catch(() => null);

    return {
      awb: String(awbData.awb_code),
      courierName: awbData.courier_name ?? "",
      trackingUrl: cfg.trackingUrl(awbData.awb_code),
      partnerOrderId: String(created.order_id ?? ""),
      partnerShipmentId: String(shipmentId),
      labelUrl: label?.label_url ?? "",
    };
  },

  async track(order) {
    const data = await call(`/courier/track/awb/${encodeURIComponent(order.shipment.awb)}`);
    const tracking = data?.tracking_data ?? {};
    const text = tracking.shipment_track?.[0]?.current_status ?? tracking.shipment_track_activities?.[0]?.activity ?? "";
    return { text: String(text), status: mapShiprocketStatus(text) };
  },

  async cancel(order) {
    if (!order.shipment.partnerOrderId) return;
    await call("/orders/cancel", { method: "POST", json: { ids: [Number(order.shipment.partnerOrderId)] } });
  },
};
