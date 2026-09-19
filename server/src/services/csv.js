// CSV exports for the admin (opens cleanly in Excel / Google Sheets).

const cell = (value) => {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** columns: [{ label, value: (row) => any }] */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => cell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  // BOM so Excel reads ₹ and other UTF-8 characters correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function sendCsv(res, name, rows, columns) {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="azelle-${name}-${stamp}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(toCsv(rows, columns));
}

export const istDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "");
