import { useCallback, useEffect, useState } from "react";
import { fieldClass } from "@/components/ui/Field";
import { SearchIcon } from "@/components/ui/Icons";
import { Stars } from "@/components/ui/Stars";
import { sized } from "@/lib/images";
import { IconEye, IconReviews, IconTrash } from "../icons";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminReviewsApi, type AdminReview, type ReviewStatus } from "../adminApi";
import { EmptyState, formatDateTime, isUnauthorized, messageOf, NoticeBanner, PageHeader, Pagination, useNotice } from "../ui";

const TABS: { id: ReviewStatus | ""; label: string }[] = [
  { id: "pending", label: "Waiting for approval" },
  { id: "approved", label: "Published" },
  { id: "hidden", label: "Hidden" },
  { id: "", label: "All" },
];

const STATUS_STYLE: Record<ReviewStatus, string> = {
  pending: "bg-[#fbecc8] text-[#7a5200]",
  approved: "bg-[#dcefe2] text-[#1f6a3c]",
  hidden: "bg-[#ece8e1] text-[#5b5249]",
};

export default function AdminReviews() {
  const { guard } = useAdminAuth();
  const [status, setStatus] = useState<ReviewStatus | "">("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminReviewsApi.list>> | null>(null);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useNotice();

  const load = useCallback(async () => {
    try {
      setData(await guard(adminReviewsApi.list({ status, q: query.trim(), page })));
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not load reviews.") });
    }
  }, [guard, status, query, page, setNotice]);

  useEffect(() => {
    document.title = "Reviews — Azelle admin";
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const act = async (review: AdminReview, next: ReviewStatus | "delete") => {
    setBusyId(review.id);
    try {
      if (next === "delete") await guard(adminReviewsApi.remove(review.id));
      else await guard(adminReviewsApi.setStatus(review.id, next));
      setNotice({
        tone: "success",
        text: next === "delete" ? "Review deleted." : next === "approved" ? "Review published — the product rating is updated." : next === "hidden" ? "Review hidden from the store." : "Moved back to waiting.",
      });
      await load();
    } catch (err) {
      if (!isUnauthorized(err)) setNotice({ tone: "error", text: messageOf(err, "Could not update the review.") });
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Customers" title="Reviews" subtitle="New reviews appear on the store only after you publish them. Ratings on product cards update straight away." />
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

      <div className="row-scroll -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Review status">
        {TABS.map((t) => {
          const on = t.id === status;
          const n = t.id ? data?.counts[t.id] ?? 0 : Object.values(data?.counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
          return (
            <button
              key={t.id || "all"}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[11px] ${on ? "bg-bg/20" : "bg-surface2"} ${t.id === "pending" && n ? "!bg-[#c9772b] text-white" : ""}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 mt-1 -translate-y-1/2" width={18} height={18} aria-hidden="true" />
        <label htmlFor="reviews-q" className="sr-only">
          Search reviews
        </label>
        <input
          id="reviews-q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Name, email or words in the review"
          className={`${fieldClass} pl-10`}
        />
      </div>

      <div className="mt-6">
        {!data ? (
          <p className="py-16 text-center text-sm" role="status">
            Loading reviews…
          </p>
        ) : data.reviews.length === 0 ? (
          <EmptyState title="No reviews here" body={status === "pending" ? "Nothing is waiting for approval." : "Customer reviews will appear here."} />
        ) : (
          <ul className="space-y-4">
            {data.reviews.map((r) => (
              <li key={r.id} className="admin-card admin-rise rounded-[20px] p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-surface2">
                    {r.product?.images?.[0] && <img src={sized(r.product.images[0], 120)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold">{r.product?.name ?? "Deleted product"}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                      {r.verifiedPurchase && <span className="rounded-full bg-[#dcefe2] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a3c]">✓ Verified purchase</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} size={15} />
                      <span className="text-sm font-semibold">{r.rating}/5</span>
                      {r.title && <span className="text-sm font-semibold">· {r.title}</span>}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
                    <p className="mt-2 text-[12.5px] text-soft">
                      {r.name}
                      {r.city ? `, ${r.city}` : ""} · {r.email} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status !== "approved" && (
                    <button type="button" className="abtn abtn-add" disabled={busyId === r.id} onClick={() => void act(r, "approved")}>
                      <IconReviews size={16} /> Publish
                    </button>
                  )}
                  {r.status !== "hidden" && (
                    <button type="button" className="abtn abtn-edit" disabled={busyId === r.id} onClick={() => void act(r, "hidden")}>
                      <IconEye size={16} /> Hide
                    </button>
                  )}
                  <button type="button" className="abtn abtn-delete" disabled={busyId === r.id} onClick={() => void act(r, "delete")}>
                    <IconTrash size={16} /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </div>
  );
}
