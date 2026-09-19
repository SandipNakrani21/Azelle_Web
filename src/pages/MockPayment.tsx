import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/products";

// Local stand-in for Cashfree's / Razorpay's hosted payment page, used only with dummy keys.
// It lets you walk through a real checkout: pay, fail or cancel, then return to the order page.

type MockPaymentInfo = { provider: "cashfree" | "razorpay"; orderNumber: string; amount: number; status: "created" | "paid" | "failed"; returnUrl: string };

const BRAND = {
  cashfree: { name: "Cashfree Payments", color: "#6933d3" },
  razorpay: { name: "Razorpay", color: "#0c2451" },
};

const METHODS = ["UPI", "Cards", "Net banking", "Wallets"] as const;

export default function MockPayment() {
  const { id = "" } = useParams();
  const [info, setInfo] = useState<MockPaymentInfo | null>(null);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("UPI");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Test payment — Azelle";
    api<{ payment: MockPaymentInfo }>(`/api/mock-payments/${encodeURIComponent(id)}`).then(
      (d) => setInfo(d.payment),
      (err) => setError(err instanceof Error ? err.message : "Test payment not found."),
    );
  }, [id]);

  const finish = async (outcome: "success" | "failure") => {
    setBusy(true);
    try {
      const { returnUrl } = await api<{ returnUrl: string }>(`/api/mock-payments/${encodeURIComponent(id)}`, { method: "POST", json: { outcome } });
      window.location.assign(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  if (error) return <Shell color="#444">{error}</Shell>;
  if (!info) return <Shell color="#444">Loading…</Shell>;

  const brand = BRAND[info.provider];
  const done = info.status !== "created";

  return (
    <Shell color={brand.color}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold" style={{ color: brand.color }}>
          {brand.name}
        </p>
        <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a5200]">Test mode</span>
      </div>
      <p className="mt-1 text-[13px] text-[#666]">Simulated payment page — no real money moves. Real keys show the real {brand.name} page here.</p>

      <div className="mt-6 rounded-[12px] bg-[#f6f6f8] p-4">
        <p className="text-[13px] text-[#666]">Paying Azelle Fragrances · Order {info.orderNumber}</p>
        <p className="mt-1 font-sans text-3xl font-bold tabular-nums">{formatPrice(info.amount)}</p>
      </div>

      {done ? (
        <p className="mt-6 text-sm">This test payment is already {info.status}.</p>
      ) : (
        <>
          <fieldset className="mt-6">
            <legend className="text-[13px] font-semibold">Payment method</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2.5 text-sm ${method === m ? "border-2" : "border-[#ddd]"}`} style={method === m ? { borderColor: brand.color } : undefined}>
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" disabled={busy} onClick={() => void finish("success")} className="mt-6 h-12 w-full rounded-[10px] font-semibold text-white disabled:opacity-60" style={{ background: brand.color }}>
            Pay {formatPrice(info.amount)} (simulate success)
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void finish("failure")} className="h-11 rounded-[10px] border border-[#e0b4b0] text-sm font-semibold text-[#8c1d18]">
              Simulate failure
            </button>
            <button type="button" disabled={busy} onClick={() => window.location.assign(info.returnUrl)} className="h-11 rounded-[10px] border border-[#ddd] text-sm font-semibold">
              Cancel & go back
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#eef0f4] px-4 py-10 font-sans text-[#1b1b1f]" style={{ borderTop: `6px solid ${color}` }}>
      <main className="w-full max-w-[420px] rounded-[18px] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,.12)] md:p-8">{children}</main>
    </div>
  );
}
