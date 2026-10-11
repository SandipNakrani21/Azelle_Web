// Copy existing approved Imperium reviews to its local design variant.
// Run from server/: node --env-file-if-exists=.env src/seed/copy-imperium-reviews.js
import mongoose from 'mongoose';
import { config } from '../config.js';
import { Product } from '../models/Product.js';
import { Review, refreshProductRating } from '../models/Review.js';

try {
  if (/mongodb\+srv:|mongodb\.net/i.test(config.mongoUri)) throw new Error('This review copy is for the local preview database only.');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const source = await Product.findOne({ slug: 'imperium', isDeleted: false });
  const target = await Product.findOne({ slug: 'imperium-2', isDeleted: false });
  if (!source || !target) throw new Error('Both Imperium products must exist.');
  const reviews = await Review.find({ product: source._id, status: 'approved' }).lean();
  let added = 0;
  for (const review of reviews) {
    const marker = `Copied from Imperium review ${review._id}`;
    if (await Review.exists({ product: target._id, adminNote: marker })) continue;
    const { _id, __v, product, ...fields } = review;
    await Review.create({ ...fields, product: target._id, adminNote: marker });
    added++;
  }
  await refreshProductRating(target._id);
  const updated = await Product.findById(target._id).lean();
  console.log(JSON.stringify({ added, ratingCount: updated.ratingCount, average: updated.ratingAvg, writtenReviews: await Review.countDocuments({ product: target._id, status: 'approved', body: { $ne: '' } }) }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
