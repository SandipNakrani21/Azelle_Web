// Opens Cashfree's or Razorpay's hosted checkout. Card and UPI details are entered on the gateway's
// own page / window, never on Azelle's site.
import type { PaymentSession } from "@/lib/orders";

const SCRIPTS = {
  cashfree: "https://sdk.cashfree.com/js/v3/cashfree.js",
  razorpay: "https://checkout.razorpay.com/v1/checkout.js",
} as const;

const loading = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      reject(new Error("The payment window couldn't load. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  loading.set(src, promise);
  return promise;
}

type CashfreeSdk = (opts: { mode: "sandbox" | "production" }) => {
  checkout: (opts: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<unknown>;
};

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Cashfree?: CashfreeSdk;
    Razorpay?: RazorpayCtor;
  }
}

export type PaymentOutcome =
  /** Cashfree: the page is leaving for Cashfree; it returns to the order page afterwards. */
  | { kind: "redirected" }
  | { kind: "razorpay_success"; response: RazorpayResponse }
  | { kind: "dismissed" };

export async function openPayment(session: PaymentSession): Promise<PaymentOutcome> {
  if (session.gateway === "mock") {
    window.location.assign(session.url);
    return { kind: "redirected" };
  }

  if (session.gateway === "cashfree") {
    await loadScript(SCRIPTS.cashfree);
    if (!window.Cashfree) throw new Error("The payment window couldn't load.");
    const cashfree = window.Cashfree({ mode: session.mode });
    await cashfree.checkout({ paymentSessionId: session.paymentSessionId, redirectTarget: "_self" });
    return { kind: "redirected" };
  }

  await loadScript(SCRIPTS.razorpay);
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("The payment window couldn't load.");
  return new Promise<PaymentOutcome>((resolve) => {
    const rzp = new Razorpay({
      key: session.keyId,
      order_id: session.razorpayOrderId,
      amount: session.amount,
      currency: session.currency,
      name: session.name,
      description: session.description,
      prefill: session.prefill,
      theme: { color: session.themeColor },
      handler: (response: RazorpayResponse) => resolve({ kind: "razorpay_success", response }),
      modal: { ondismiss: () => resolve({ kind: "dismissed" }) },
    });
    // A failed attempt keeps Razorpay's window open so the customer can try another method;
    // closing it resolves as "dismissed".
    rzp.open();
  });
}
