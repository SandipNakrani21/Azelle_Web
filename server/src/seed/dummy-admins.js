// LOCAL TESTING ONLY — 15 sample admin users spread across the five roles, so the Users page
// (search, filters, paging, the people-per-role panel) has something to show.
// Every one of them uses an @azelle.test email, which is how they are found again and removed.
// Never run this against the live (Atlas) database.
//
//   node --env-file=.env src/seed/dummy-admins.js           add (replaces earlier dummy users)
//   node --env-file=.env src/seed/dummy-admins.js --remove  remove them all
import mongoose from "mongoose";
import { config } from "../config.js";
import { AdminUser, Role, syncDefaultRoles } from "../models/AdminUser.js";
import { hashPassword } from "../rbac.js";

const DOMAIN = "azelle.test";
/** The same password for every dummy account — local test data only. */
const PASSWORD = "Azelle@1234";

if (/mongodb\+srv:|mongodb\.net/i.test(config.mongoUri)) {
  console.error("Refusing to run: MONGODB_URI points at a hosted (Atlas) database. Dummy admins are for local use only.");
  process.exit(1);
}

// name, role key, mobile, whether the account is switched on, days since their last sign-in (null = never)
const PEOPLE = [
  ["Priya Raman", "super_admin", "9820011223", true, 1],
  ["Arjun Mehta", "admin", "9833044556", true, 2],
  ["Sneha Kulkarni", "admin", "9845077889", true, 6],
  ["Vikram Shetty", "admin", "9867010112", false, 44],
  ["Ananya Bose", "manager", "9878023345", true, 1],
  ["Rahul Nair", "manager", "9889056678", true, 9],
  ["Fatima Shaikh", "manager", "9890089901", true, 21],
  ["Karthik Iyer", "user", "9901012234", true, 3],
  ["Meera Joshi", "user", "9912045567", true, 12],
  ["Devansh Patel", "user", "9923078890", true, null],
  ["Ritu Chawla", "user", "9934001123", false, 63],
  ["Sameer Khan", "viewer", "9945034456", true, 4],
  ["Tanvi Desai", "viewer", "9956067789", true, 17],
  ["Harsh Vora", "viewer", "9967090012", true, null],
  ["Lakshmi Pillai", "viewer", "9978023345", true, 30],
];

const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${DOMAIN}`;

async function main() {
  await mongoose.connect(config.mongoUri);
  await syncDefaultRoles();

  const removed = await AdminUser.deleteMany({ email: new RegExp(`@${DOMAIN}$`) });
  if (process.argv.includes("--remove")) {
    console.log(`Removed ${removed.deletedCount} dummy admin users.`);
    return;
  }

  const roles = await Role.find({ key: { $ne: null } });
  const byKey = new Map(roles.map((r) => [r.key, r._id]));
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const docs = PEOPLE.map(([name, key, phone, active, daysAgo], i) => {
    const role = byKey.get(key);
    if (!role) throw new Error(`Built-in role "${key}" is missing — start the server once so the roles are created.`);
    return {
      name,
      email: emailFor(name),
      phone,
      passwordHash: hashPassword(PASSWORD),
      role,
      active,
      lastLoginAt: daysAgo === null ? null : new Date(now - daysAgo * day),
      // Spread the sign-up dates so "newest first" has something to sort by.
      createdAt: new Date(now - (i + 1) * 5 * day),
      updatedAt: new Date(now - (i + 1) * 5 * day),
    };
  });

  await AdminUser.insertMany(docs);

  const counts = {};
  for (const [, key] of PEOPLE) counts[key] = (counts[key] ?? 0) + 1;
  console.log(`Added ${docs.length} dummy admin users (password for all: ${PASSWORD})`);
  for (const [key, n] of Object.entries(counts)) console.log(`  ${key.padEnd(12)} ${n}`);
  console.log(`Remove them again with: node --env-file=.env src/seed/dummy-admins.js --remove`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
