import { commerce, isDummy } from "../../commerce.config.js";
import { delhivery } from "./delhivery.js";
import { mockShipper } from "./mock.js";
import { shiprocket } from "./shiprocket.js";

// Dummy keys (e.g. DELHIVERY_API_TOKEN=dummy_token) swap a partner for its local test-mode version.
export const SHIPPERS = {
  shiprocket: isDummy(commerce.shipping.shiprocket) ? mockShipper("shiprocket", "Shiprocket") : shiprocket,
  delhivery: isDummy(commerce.shipping.delhivery) ? mockShipper("delhivery", "Delhivery") : delhivery,
};

/** Parcel for an order: bottle weights from the config plus packaging, standard box size. */
export function defaultParcel(order) {
  const { weightPerSizeKg, packagingKg, dimensionsCm } = commerce.shipping.parcel;
  const bottles = order.lines.reduce((kg, l) => kg + (weightPerSizeKg[l.sizeId] ?? 0.3) * l.qty, 0);
  return { weightKg: Math.round((bottles + packagingKg) * 100) / 100, ...dimensionsCm };
}

/** Cleans a parcel override from the admin; falls back to the defaults. */
export function parseParcel(input, order) {
  const base = defaultParcel(order);
  const num = (v, fallback, max) => {
    const n = Number(v);
    return n > 0 && n <= max ? Math.round(n * 100) / 100 : fallback;
  };
  return {
    weightKg: num(input?.weightKg, base.weightKg, 30),
    length: num(input?.length, base.length, 150),
    breadth: num(input?.breadth, base.breadth, 150),
    height: num(input?.height, base.height, 150),
  };
}
