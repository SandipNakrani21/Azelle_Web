import crypto from "node:crypto";

// Test-mode shipping partner used when its keys start with "dummy": realistic couriers and rates,
// a generated AWB, and tracking that moves one step forward each time the admin refreshes it.

const SHIPROCKET_COURIERS = [
  { id: "10", name: "Delhivery Surface", base: 58, etd: "3–5 days" },
  { id: "12", name: "Xpressbees Surface", base: 54, etd: "4–6 days" },
  { id: "14", name: "Ekart Logistics", base: 51, etd: "4–7 days" },
  { id: "16", name: "DTDC Surface", base: 62, etd: "4–6 days" },
  { id: "18", name: "Blue Dart Surface", base: 94, etd: "2–4 days" },
];

// Tracking steps the mock walks through: [courier text, order status or null].
const STEPS = [
  ["Pickup scheduled", null],
  ["Picked up", "shipped"],
  ["In transit", "shipped"],
  ["Out for delivery", "shipped"],
  ["Delivered", "delivered"],
];

const awbFor = (id) => (id === "delhivery" ? "9" : "1") + String(crypto.randomInt(10 ** 10, 10 ** 11 - 1)).slice(0, 12);

export function mockShipper(id, label) {
  const isCod = (order) => order.payment.method === "cod";
  const weightCharge = (kg) => Math.max(0, Math.ceil((kg - 0.5) / 0.5)) * 22;

  return {
    id,
    label: `${label} (test mode)`,
    isMock: true,
    isConfigured: () => true,

    async options(order, parcel) {
      // PIN codes starting with 9 are treated as not serviceable, to show that path.
      if (order.address.pincode.startsWith("9")) return { serviceable: false, couriers: [], message: `${label} does not deliver to this PIN code (test mode).` };
      const extra = weightCharge(parcel.weightKg) + (isCod(order) ? 32 : 0);
      if (id === "delhivery") {
        return { serviceable: true, couriers: [{ id: "", name: "Delhivery Surface", rate: 60 + extra, etd: "3–5 days", recommended: true }] };
      }
      const couriers = SHIPROCKET_COURIERS.map((c) => ({ id: c.id, name: c.name, rate: c.base + extra, etd: c.etd, recommended: c.id === "12" }));
      return { serviceable: true, couriers: couriers.sort((a, b) => a.rate - b.rate) };
    },

    async createShipment(order, { courierId }) {
      const courier =
        id === "delhivery" ? "Delhivery" : (SHIPROCKET_COURIERS.find((c) => c.id === courierId) ?? SHIPROCKET_COURIERS[1]).name;
      return {
        awb: awbFor(id),
        courierName: courier,
        trackingUrl: "",
        partnerOrderId: id === "shiprocket" ? String(crypto.randomInt(100000000, 999999999)) : order.number,
        partnerShipmentId: String(crypto.randomInt(100000000, 999999999)),
        labelUrl: "",
      };
    },

    async track(order) {
      const index = STEPS.findIndex(([text]) => text === order.shipment.lastStatus);
      const [text, status] = STEPS[Math.min(index + 1, STEPS.length - 1)];
      return { text, status };
    },

    async cancel() {},
  };
}
