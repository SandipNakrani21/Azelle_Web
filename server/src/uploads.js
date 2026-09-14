import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

/** True inside a Vercel deployment (its function filesystem is read-only and temporary). */
export const ON_VERCEL = Boolean(process.env.VERCEL);
/** When a Vercel Blob store is connected, uploads are stored there and served from its CDN. */
export const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
if (!ON_VERCEL) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const newFileName = (mimetype) => `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXTENSIONS[mimetype]}`;

export const imageUpload = multer({
  storage:
    USE_BLOB || ON_VERCEL
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination: UPLOADS_DIR,
          filename: (_req, file, cb) => cb(null, newFileName(file.mimetype)),
        }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    const err = new Error("Upload a JPG, PNG, WebP or AVIF image.");
    err.status = 400;
    cb(err);
  },
});

/** Checks the file's magic bytes so a renamed non-image can't be served as one. */
function isImageHeader(b) {
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  const avif = b.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(b.toString("ascii", 8, 12));
  return jpg || png || webp || avif;
}

async function readHeader(filePath) {
  const handle = await fsp.open(filePath, "r");
  try {
    const { buffer } = await handle.read(Buffer.alloc(16), 0, 16, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

/**
 * Validates an uploaded image and stores it. Returns its public URL, or null when the file isn't a
 * real image. Uses Vercel Blob when connected, otherwise the local uploads folder.
 */
export async function saveUploadedImage(file) {
  const header = file.buffer ? file.buffer.subarray(0, 16) : await readHeader(file.path);
  if (!isImageHeader(header)) {
    if (file.path) await fsp.unlink(file.path).catch(() => {});
    return null;
  }

  if (USE_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${newFileName(file.mimetype)}`, file.buffer, { access: "public", contentType: file.mimetype });
    return blob.url;
  }

  if (ON_VERCEL) {
    const err = new Error("Image uploads need Vercel Blob. Connect a Blob store to this project in the Vercel dashboard.");
    err.status = 503;
    throw err;
  }

  return `/uploads/${file.filename}`;
}
