import { api } from "./api";

/** The signed-in shopper, as the server describes them. */
export type Account = { id: string; name: string; email: string; phone: string; marketing: boolean };

export type SignupInput = { name: string; email: string; phone: string; password: string; marketing?: boolean };
export type ProfileInput = { name: string; phone: string; marketing: boolean };

/** Storefront accounts. The session lives in an http-only cookie, so nothing is kept in JavaScript. */
export const accountApi = {
  me: () => api<{ customer: Account | null }>("/api/account/me"),
  login: (email: string, password: string) => api<{ customer: Account }>("/api/account/login", { method: "POST", json: { email, password } }),
  signup: (input: SignupInput) => api<{ customer: Account }>("/api/account/signup", { method: "POST", json: input }),
  logout: () => api<{ ok: true }>("/api/account/logout", { method: "POST" }),
  updateProfile: (input: ProfileInput) => api<{ customer: Account }>("/api/account/me", { method: "PUT", json: input }),
};
