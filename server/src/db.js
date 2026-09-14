import mongoose from "mongoose";
import { config } from "./config.js";

const redact = (uri) => uri.replace(/\/\/([^@/]+)@/, "//***@");

let connecting = null;

/** Connects once; later calls reuse the open connection (important for serverless cold/warm starts). */
export function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connecting ??= (async () => {
    mongoose.set("strictQuery", true);
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    } catch (err) {
      throw new Error(`Could not connect to MongoDB at ${redact(config.mongoUri)}. Is the database reachable? (${err.message})`);
    }
    console.log(`MongoDB connected: ${redact(config.mongoUri)}`);
  })().catch((err) => {
    connecting = null;
    throw err;
  });
  return connecting;
}
