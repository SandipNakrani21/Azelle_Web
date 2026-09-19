// Simple in-memory rate limiter (per server instance) for public endpoints.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ error: message });
    next();
  };
}
