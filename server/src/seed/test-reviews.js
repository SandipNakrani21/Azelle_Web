// LOCAL TESTING ONLY — sample ratings for Imperium so the rating UI can be tried out.
// Every record is flagged `testData: true`. Never run this against the live (Atlas) database.
//
//   node --env-file=.env src/seed/test-reviews.js           add (replaces earlier test data)
//   node --env-file=.env src/seed/test-reviews.js --remove  remove all test reviews
import mongoose from "mongoose";
import { config } from "../config.js";
import { Product } from "../models/Product.js";
import { refreshProductRating, Review } from "../models/Review.js";

const SLUG = "imperium";

if (/mongodb\+srv:|mongodb\.net/i.test(config.mongoUri)) {
  console.error("Refusing to run: MONGODB_URI points at a hosted (Atlas) database. Test reviews are for local use only.");
  process.exit(1);
}

// 5 written reviews (shown in the list) + 112 star-only ratings → 117 ratings, average 4.5.
const WRITTEN = [
  { rating: 5, title: "My new signature", body: "Opens with juicy pineapple and a clean lavender freshness, then settles into warm cinnamon and amber. I get compliments every time I wear it to the office.", name: "Aarav S.", city: "Mumbai", verified: true, daysAgo: 6 },
  { rating: 5, title: "Lasts the whole day", body: "Two sprays in the morning and I can still smell it on my shirt at night. Projection is strong for the first few hours, then it sits close to the skin.", name: "Neha K.", city: "Bengaluru", verified: true, daysAgo: 19 },
  { rating: 4, title: "Great for evenings", body: "Rich and confident. A little too strong for a hot afternoon, but perfect for dinners and weddings. The bottle looks premium too.", name: "Rohit M.", city: "Pune", verified: true, daysAgo: 34 },
  { rating: 5, title: "Beautifully balanced", body: "Fresh at the start, spicy in the middle and a smooth, woody dry-down. Feels far more expensive than it is.", name: "Kavya R.", city: "Hyderabad", verified: false, daysAgo: 52 },
  { rating: 4, title: "Well packed, fast delivery", body: "Arrived in three days, very well packed. The scent is lovely — I only wish there was a travel size.", name: "Imran A.", city: "Surat", verified: true, daysAgo: 71 },
];
const STAR_ONLY = { 5: 72, 4: 28, 3: 8, 2: 3, 1: 1 }; // 112 ratings

async function main() {
  await mongoose.connect(config.mongoUri);
  const product = await Product.findOne({ slug: SLUG, isDeleted: false });
  if (!product) throw new Error(`No product with slug "${SLUG}".`);

  const removed = await Review.deleteMany({ product: product._id, testData: true });
  if (process.argv.includes("--remove")) {
    await refreshProductRating(product._id);
    console.log(`Removed ${removed.deletedCount} test reviews from ${product.name}.`);
    return;
  }

  const day = 24 * 60 * 60 * 1000;
  const docs = WRITTEN.map((r, i) => ({
    product: product._id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    name: r.name,
    city: r.city,
    email: `test-reviewer-${i + 1}@example.invalid`,
    verifiedPurchase: r.verified,
    status: "approved",
    testData: true,
    createdAt: new Date(Date.now() - r.daysAgo * day),
  }));
  let n = 0;
  for (const [stars, count] of Object.entries(STAR_ONLY)) {
    for (let i = 0; i < count; i += 1) {
      n += 1;
      docs.push({
        product: product._id,
        rating: Number(stars),
        body: "",
        name: "Customer",
        email: `test-rating-${n}@example.invalid`,
        verifiedPurchase: true,
        status: "approved",
        testData: true,
        createdAt: new Date(Date.now() - (80 + n) * day),
      });
    }
  }

  await Review.insertMany(docs, { timestamps: false });
  await refreshProductRating(product._id);
  const fresh = await Product.findById(product._id).lean();
  console.log(`${product.name}: ${fresh.ratingAvg} average from ${fresh.ratingCount} ratings (${WRITTEN.length} written reviews). All flagged testData.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
