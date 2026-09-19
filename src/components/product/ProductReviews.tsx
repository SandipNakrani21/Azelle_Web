import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { fieldClass, fieldErrorClass, labelClass } from "@/components/ui/Field";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stars, StarInput } from "@/components/ui/Stars";
import { trackEvent } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import type { Product } from "@/lib/products";
import { fetchReviews, reviewCountLabel, submitReview, type Review, type ReviewSort, type ReviewSummary } from "@/lib/reviews";
import { useAuth } from "@/providers/AuthProvider";

/** Smooth-scrolls to the reviews; jumps there if smooth scrolling didn't move the page (e.g. reduced motion). */
export function scrollToReviews() {
  const el = document.getElementById("reviews");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    if (Math.abs(el.getBoundingClientRect().top) > window.innerHeight) el.scrollIntoView({ block: "start" });
  }, 700);
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// "Customer reviews" — the last section of the product page (id="reviews", linked from the rating
// under the product name and from product cards).
export function ProductReviews({ product }: { product: Product }) {
  const { hash } = useLocation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(
    async (nextPage: number, nextSort: ReviewSort, append: boolean) => {
      setLoading(true);
      try {
        const data = await fetchReviews(product.id, { page: nextPage, sort: nextSort });
        setReviews((list) => (append ? [...list, ...data.reviews] : data.reviews));
        setSummary(data.summary);
        setPage(data.page);
        setPages(data.pages);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load reviews.");
      } finally {
        setLoading(false);
      }
    },
    [product.id],
  );

  useEffect(() => {
    setFormOpen(false);
    setSort("newest");
    void load(1, "newest", false);
  }, [load]);

  // Arriving from a product card's rating (…#reviews): once the reviews have loaded, jump here
  // directly (no animation, so it can't race the page's own scroll handling).
  const jumped = useRef("");
  useEffect(() => {
    if (hash !== "#reviews" || loading || jumped.current === product.id) return;
    const t = window.setTimeout(() => {
      jumped.current = product.id; // once per product, so "Show more reviews" doesn't jump back
      document.getElementById("reviews")?.scrollIntoView({ block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [hash, product.id, loading]);

  const count = summary?.count ?? 0;

  return (
    <section id="reviews" aria-labelledby="reviews-h" className="border-t border-line bg-surface py-16 md:py-24">
      <SectionHeading id="reviews-h" sub="What our customers say" title="Customer reviews" />

      <div className="mx-auto mt-12 grid max-w-[1100px] items-start gap-8 px-5 md:px-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
        {/* Summary */}
        <div className="rounded-[20px] border border-line bg-bg p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {count > 0 && summary ? (
            <>
              <p className="flex items-end gap-3">
                <span className="font-sans text-[3rem] font-bold leading-none tracking-tight">{summary.average.toFixed(1)}</span>
                <span className="pb-1.5 text-sm">out of 5</span>
              </p>
              <Stars value={summary.average} size={20} className="mt-3" />
              <p className="mt-2 text-sm">Based on {reviewCountLabel(count)}</p>
              <ul className="mt-5 space-y-2" aria-label="Rating breakdown">
                {(["5", "4", "3", "2", "1"] as const).map((star) => {
                  const n = summary.breakdown[star];
                  const pct = count ? Math.round((n / count) * 100) : 0;
                  return (
                    <li key={star} className="flex items-center gap-3 text-[13px]">
                      <span className="w-8 shrink-0">{star} ★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--menu-gradient)" }} />
                      </span>
                      <span className="w-8 shrink-0 text-right tabular-nums">{n}</span>
                      <span className="sr-only">
                        {star} stars: {n} reviews
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <Stars value={0} size={20} />
              <p className="mt-3 font-display text-2xl">No reviews yet</p>
              <p className="mt-2 text-sm">Tried {product.name}? Be the first to share how it wears.</p>
            </>
          )}
          <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
            {formOpen ? "Close" : "Write a review"}
          </button>
        </div>

        {/* Form + list */}
        <div>
          {formOpen && <ReviewForm product={product} onDone={() => setFormOpen(false)} />}

          {(summary?.reviewCount ?? 0) > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                {summary!.reviewCount === 1 ? "1 written review" : `${summary!.reviewCount} written reviews`}
                {summary!.reviewCount < count && <span className="font-normal text-soft"> · the rest are star ratings</span>}
              </p>
              <label className="flex items-center gap-2 text-sm">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => {
                    const next = e.target.value as ReviewSort;
                    setSort(next);
                    void load(1, next, false);
                  }}
                  className="h-10 rounded-[10px] border border-line bg-surface px-3"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rating</option>
                  <option value="lowest">Lowest rating</option>
                </select>
              </label>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-[#b3261e]">
              {error}
            </p>
          )}

          <ul className="mt-2 divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} size={16} />
                  {r.title && <p className="font-semibold">{r.title}</p>}
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{r.body}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[13px] text-soft">
                  <span className="font-semibold text-ink">{r.name}</span>
                  {r.city && <span>· {r.city}</span>}
                  <span>· {formatDate(r.createdAt)}</span>
                  {r.verifiedPurchase && <span className="rounded-full bg-[#dcefe2] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a3c]">✓ Verified purchase</span>}
                </p>
                <span className="sr-only">Rated {r.rating} out of 5</span>
              </li>
            ))}
          </ul>

          {loading && reviews.length === 0 && (
            <p className="py-6 text-sm" role="status">
              Loading reviews…
            </p>
          )}
          {page < pages && (
            <button type="button" className="btn btn-secondary mt-2" disabled={loading} onClick={() => void load(page + 1, sort, true)}>
              {loading ? "Loading…" : "Show more reviews"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | boolean>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const input = { productId: product.id, rating, title: get("title"), body: get("body"), name: get("name"), email: get("email"), city: get("city") };
    const found: Record<string, string> = {};
    if (!rating) found.rating = "Choose a star rating.";
    if (input.body.length < 10) found.body = "Tell us a little more (at least 10 characters).";
    if (input.name.length < 2) found.name = "Enter your name.";
    if (!input.email.includes("@")) found.email = "Enter a valid email address.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSending(true);
    setError("");
    try {
      const { published } = await submitReview(input);
      trackEvent("review_submitted");
      setSent(published);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(err instanceof Error ? err.message : "Could not send your review.");
    } finally {
      setSending(false);
    }
  };

  if (sent !== null) {
    return (
      <div role="status" className="mb-8 rounded-[20px] border border-line bg-bg p-6">
        <p className="font-display text-2xl">Thank you for your review</p>
        <p className="mt-2 text-sm">{sent ? "It's now live on this page." : "It will appear here once our team has checked it — usually within a day."}</p>
        <button type="button" className="btn btn-secondary mt-5" onClick={onDone}>
          Close
        </button>
      </div>
    );
  }

  const err = (k: string) => errors[k] && <p className={fieldErrorClass}>{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="mb-8 rounded-[20px] border border-line bg-bg p-6">
      <p className="font-display text-2xl">Review {product.name}</p>
      <div className="mt-4">
        <p className={labelClass}>Your rating</p>
        <div className="mt-2">
          <StarInput value={rating} onChange={setRating} />
        </div>
        {err("rating")}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="review-title" className={labelClass}>
            Title <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input id="review-title" name="title" maxLength={80} className={fieldClass} placeholder="e.g. Lasts all day" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="review-body" className={labelClass}>
            Your review
          </label>
          <textarea id="review-body" name="body" rows={4} maxLength={1500} className={`${fieldClass} h-auto py-3`} placeholder="How does it smell and wear? How long did it last?" />
          {err("body")}
        </div>
        <div>
          <label htmlFor="review-name" className={labelClass}>
            Name
          </label>
          <input id="review-name" name="name" defaultValue={user?.name ?? ""} autoComplete="name" className={fieldClass} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="review-city" className={labelClass}>
            City <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input id="review-city" name="city" autoComplete="address-level2" className={fieldClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="review-email" className={labelClass}>
            Email
          </label>
          <input id="review-email" name="email" type="email" defaultValue={user?.email ?? ""} autoComplete="email" className={fieldClass} />
          <p className="mt-1.5 text-[13px] text-soft">Not shown publicly. Used to mark verified purchases.</p>
          {err("email")}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#b3261e]">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary mt-6" disabled={sending}>
        {sending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
