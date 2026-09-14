// Vercel serverless function: every /api/* request is routed here (see vercel.json) and handled by
// the same Express app that runs locally. The app and its MongoDB connection are reused while warm.
import { getApp } from "../server/src/app.js";

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "The server is not responding. Please try again shortly." }));
  }
}
