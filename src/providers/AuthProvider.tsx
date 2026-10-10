import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountApi, type Account } from "@/lib/account";
import { trackEvent } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { forgetVisitorIdentity, identifyVisitor } from "@/lib/visits";

export type User = { name: string; email: string; phone?: string };

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
/** Indian mobile number: 10 digits starting with 6–9 (the +91 country code is fixed in the form). */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
/** 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol. */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => void;
  isAuthOpen: boolean;
  /** Opens the auth modal; `onSuccess` runs once the user is signed in. */
  openAuth: (onSuccess?: () => void) => void;
  closeAuth: () => void;
};

// The account itself lives in the database behind an http-only session cookie (/api/account).
// This copy is only so the header shows the right name before the first "who am I" answers.
const STORAGE_KEY = "azelle.user";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed === "object" && "email" in parsed && "name" in parsed) return parsed as User;
  } catch {
    // Ignore malformed or unavailable storage.
  }
  return null;
}

const toUser = (account: Account): User => ({ name: account.name, email: account.email, phone: account.phone });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; the session cookie still keeps them signed in.
    }
  }, [user]);

  // Ask the server who is signed in. It is the only source of truth: the session may have expired,
  // or they may have signed in on another tab.
  useEffect(() => {
    let cancelled = false;
    void accountApi
      .me()
      .then(({ customer }) => {
        if (cancelled) return;
        setUser(customer ? toUser(customer) : null);
        if (customer) identifyVisitor({ email: customer.email, name: customer.name, phone: customer.phone, via: "signin" });
      })
      .catch(() => {
        // API unreachable — keep whatever the last visit remembered rather than signing them out.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const complete = useCallback((account: Account, via: "signin" | "signup") => {
    setUser(toUser(account));
    setAuthOpen(false);
    trackEvent(via === "signup" ? "sign_up" : "sign_in");
    identifyVisitor({ email: account.email, name: account.name, phone: account.phone, via });
    const continuation = pending.current;
    pending.current = null;
    continuation?.();
  }, []);

  /** Turns a field-level API error into the single message the form shows. */
  const message = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const first = Object.values(err.fields)[0];
      return new Error(first || err.message || fallback);
    }
    return new Error(fallback);
  };

  const login = useCallback(
    async (email: string, password: string) => {
      if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
      if (!password) throw new Error("Enter your password.");
      try {
        const { customer } = await accountApi.login(email, password);
        complete(customer, "signin");
      } catch (err) {
        throw message(err, "Could not sign you in. Please try again.");
      }
    },
    [complete],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, phone: string) => {
      if (name.trim().length < 2) throw new Error("Enter your full name.");
      if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
      if (!INDIAN_MOBILE_RE.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
      if (!PASSWORD_RULE.test(password)) throw new Error("Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.");
      try {
        const { customer } = await accountApi.signup({ name: name.trim(), email, phone, password, marketing: true });
        complete(customer, "signup");
      } catch (err) {
        throw message(err, "Could not create your account. Please try again.");
      }
    },
    [complete],
  );

  const logout = useCallback(() => {
    setUser(null);
    forgetVisitorIdentity();
    void accountApi.logout().catch(() => {
      // Already signed out locally; the cookie expires on its own.
    });
  }, []);

  const openAuth = useCallback((onSuccess?: () => void) => {
    pending.current = onSuccess ?? null;
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    pending.current = null;
    setAuthOpen(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, signup, logout, isAuthOpen, openAuth, closeAuth }),
    [user, login, signup, logout, isAuthOpen, openAuth, closeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
