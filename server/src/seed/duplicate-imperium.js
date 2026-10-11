// Run from server/: node --env-file-if-exists=.env src/seed/duplicate-imperium.js
import fs from 'node:fs';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

const keys = ['family','group','families','prices','notes','pyramid','description','tagline','concentration','perfumeOil','longevity','highlights','tint','inStock'];
const duplicate = source => ({...Object.fromEntries(keys.map(key => [key, source[key]])), name:'Imperium 2', slug:'imperium-2', images:['/images/products/imperium-matched-bottle.webp', ...source.images.slice(0,5)], status:'active'});
try {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/azelle', {serverSelectionTimeoutMS:8000});
  const source = await Product.findOne({slug:'imperium',isDeleted:false}).lean();
  if (!source) throw new Error('Original Imperium product was not found.');
  const existing = await Product.findOne({slug:'imperium-2',isDeleted:false});
  if (!existing) {
    const last = await Product.findOne({isDeleted:false}).sort({sortOrder:-1}).lean();
    await Product.create({...duplicate(source),sortOrder:(last?.sortOrder ?? 0)+1});
    console.log('Created Imperium 2 with its own product ID; original Imperium preserved.');
  } else console.log('Imperium 2 already exists; preserved existing product.');
  const seedPath = new URL('./products.json', import.meta.url);
  const seed = JSON.parse(fs.readFileSync(seedPath,'utf8'));
  if (!seed.some(product => product.slug === 'imperium-2')) {
    seed.push(duplicate(source));
    fs.writeFileSync(seedPath, JSON.stringify(seed,null,2)+'\n');
  }
} catch {
  console.error('Could not duplicate Imperium. Check the database connection and source product.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
