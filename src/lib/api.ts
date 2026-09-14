export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

type ApiOptions = Omit<RequestInit, "body" | "headers"> & {
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
};

/** Same-origin JSON request (Vite proxies /api to the Node server in development). */
export async function api<T>(path: string, { json, body, headers, ...init }: ApiOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and that the API is running.", 0);
  }

  const text = await response.text();
  let data: { error?: string; fields?: Record<string, string> } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    // A non-JSON error (or a 5xx) means the API itself didn't answer — e.g. it isn't running.
    const fallback =
      data === null || response.status >= 500
        ? "The server is not responding. Make sure the API is running."
        : `Request failed (${response.status}).`;
    throw new ApiError(data?.error ?? fallback, response.status, data?.fields ?? {});
  }
  return data as T;
}
