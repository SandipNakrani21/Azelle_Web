import { commerce, isDummy } from "../../commerce.config.js";
import { cashfree } from "./cashfree.js";
import { mockGateway } from "./mock.js";
import { razorpay } from "./razorpay.js";

// Dummy keys (e.g. RAZORPAY_KEY_ID=dummy_key) swap a gateway for its local test-mode version.
export const GATEWAYS = {
  cashfree: isDummy(commerce.payments.cashfree) ? mockGateway("cashfree", "Cashfree") : cashfree,
  razorpay: isDummy(commerce.payments.razorpay) ? mockGateway("razorpay", "Razorpay") : razorpay,
};

/** Configured gateways, in the order set in commerce.config.js (first = primary). */
export function availableGateways() {
  return commerce.payments.order.map((id) => GATEWAYS[id]).filter((g) => g?.isConfigured());
}

export const hasMockGateway = () => Object.values(GATEWAYS).some((g) => g.isMock);

export function codAllowed(total) {
  const { cod } = commerce.payments;
  return cod.enabled && total <= cod.maxOrderValue;
}
