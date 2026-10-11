import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const localEmailMode = () =>
  process.env.NODE_ENV !== "production" && process.env.MAIL_MODE === "local";

export const recoveryOrigin = () =>
  localEmailMode() ? "http://localhost:5173" : process.env.PUBLIC_SITE_URL;

export const emailEnabled = () =>
  localEmailMode() ||
  (process.env.MAIL_MODE !== "local" &&
    Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM));
/** Delivery errors propagate; never report an email as delivered when SMTP is absent. */
export async function sendMail({ to, subject, text }) {
  if (localEmailMode()) {
    const directory = new URL("../../.data/mail-outbox/", import.meta.url);
    await mkdir(directory, { recursive: true });
    const id = randomUUID();
    await writeFile(
      new URL(`${id}.json`, directory),
      JSON.stringify(
        {
          id,
          mode: "local",
          delivered: false,
          createdAt: new Date().toISOString(),
          from: "Azelle Demo <no-reply@azelle.test>",
          to,
          subject,
          text,
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
    return { mode: "local", delivered: false, id };
  }
  if (!emailEnabled())
    throw Object.assign(
      new Error(
        "Email delivery is not configured. Please contact customer support.",
      ),
      { status: 503 },
    );
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
