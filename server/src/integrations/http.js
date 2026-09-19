// Small fetch wrapper for partner APIs: timeout, JSON parsing and readable errors.

export class PartnerError extends Error {
  constructor(partner, message, { status = 502, details } = {}) {
    super(`${partner}: ${message}`);
    this.partner = partner;
    this.status = status;
    this.details = details;
  }
}

export async function partnerFetch(partner, url, { method = "GET", headers = {}, json, body, timeoutMs = 15000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new PartnerError(partner, err?.name === "TimeoutError" ? "the request timed out." : "could not be reached.");
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.error?.description || data.message || data.error_description || data.rmk || data.error)) ||
      `request failed (${response.status}).`;
    throw new PartnerError(partner, typeof message === "string" ? message : JSON.stringify(message), { details: data });
  }
  return data;
}
