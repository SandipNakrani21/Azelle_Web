export function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  res.status(401).json({ error: "Your session has expired. Please sign in again." });
}
