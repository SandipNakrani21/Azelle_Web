import { api } from "@/lib/api";

export type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  name: string;
  city: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

/** `count` = every rating (incl. star-only); `reviewCount` = written reviews shown in the list. */
export type ReviewSummary = { average: number; count: number; reviewCount: number; breakdown: Record<"1" | "2" | "3" | "4" | "5", number> };
export type ReviewSort = "newest" | "highest" | "lowest";

export type ReviewInput = { productId: string; rating: number; title: string; body: string; name: string; email: string; city: string };

export const fetchReviews = (productId: string, { page = 1, sort = "newest" as ReviewSort } = {}) =>
  api<{ reviews: Review[]; summary: ReviewSummary; page: number; pages: number }>(
    `/api/reviews?product=${encodeURIComponent(productId)}&page=${page}&sort=${sort}&limit=5`,
  );

export const submitReview = (input: ReviewInput) => api<{ review: Review; published: boolean }>("/api/reviews", { method: "POST", json: input });

/** "4.6" / "No reviews yet" style label for a product's rating. */
export const reviewCountLabel = (count: number) => (count === 1 ? "1 review" : `${count} reviews`);
