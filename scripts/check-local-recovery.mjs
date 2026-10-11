import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { Customer, hashPassword } from "../server/src/models/Customer.js";
import { PasswordReset } from "../server/src/models/PasswordReset.js";
import { localEmailMode, emailEnabled } from "../server/src/services/mail.js";
if (
  process.env.NODE_ENV === "production" ||
  process.env.MAIL_MODE !== "local" ||
  !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(
    process.env.MONGODB_URI || "",
  )
)
  throw new Error("This check requires local MongoDB and MAIL_MODE=local.");
assert.equal(localEmailMode(), true);
assert.equal(emailEnabled(), true);
const originalEnvironment = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
assert.equal(localEmailMode(), false);
assert.equal(emailEnabled(), false);
process.env.NODE_ENV = originalEnvironment || "development";
const outbox = new URL("../server/.data/mail-outbox/", import.meta.url);
const email = `qa-recovery-${randomUUID()}@example.com`,
  before = new Set(await readdir(outbox).catch(() => []));
const request = (path, json) =>
  fetch(`http://localhost:4000/api/account/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
let customer,
  createdFiles = [];
await Customer.db.openUri(process.env.MONGODB_URI);
try {
  customer = await Customer.create({
    name: "QA dummy recovery",
    email,
    phone: "",
    passwordHash: hashPassword("Original-QA-123!"),
    source: "admin",
  });
  const response = await request("forgot-password", { email });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).message.includes("No email is sent"));
  const files = (await readdir(outbox)).filter((file) => !before.has(file));
  let mail;
  for (const filename of files) {
    const value = JSON.parse(await readFile(new URL(filename, outbox), "utf8"));
    if (value.to === email) {
      createdFiles.push(filename);
      mail = value;
    }
  }
  assert.ok(mail);
  assert.equal(mail.delivered, false);
  assert.equal(mail.mode, "local");
  const token = mail.text.match(/token=([a-f0-9]{64})/)[1];
  assert.ok(mail.text.includes("http://localhost:5173/reset-password"));
  const stored = await PasswordReset.findOne({ customer: customer.id });
  assert.equal(stored.hash, createHash("sha256").update(token).digest("hex"));
  assert.notEqual(stored.hash, token);
  const reset = await request("reset-password", {
    token,
    password: "Changed-QA-456!",
  });
  assert.equal(reset.status, 200);
  const updated = await Customer.findById(customer.id).select("+passwordHash");
  assert.equal(updated.verifyPassword("Changed-QA-456!"), true);
  assert.equal(
    (await request("reset-password", { token, password: "Changed-QA-789!" }))
      .status,
    400,
  );
  const expired = randomBytes(32).toString("hex");
  await PasswordReset.create({
    customer: customer.id,
    hash: createHash("sha256").update(expired).digest("hex"),
    expiresAt: new Date(Date.now() - 60000),
  });
  assert.equal(
    (
      await request("reset-password", {
        token: expired,
        password: "Changed-QA-789!",
      })
    ).status,
    400,
  );
  console.log(
    "Dummy recovery passed: local-only email, private outbox, hashed token, successful reset, single use, expiry and production guard. No real email sent.",
  );
} finally {
  if (customer) {
    await PasswordReset.deleteMany({ customer: customer.id });
    await Customer.deleteOne({ _id: customer.id });
  }
  for (const filename of createdFiles) await unlink(new URL(filename, outbox));
  await Customer.db.close();
}
