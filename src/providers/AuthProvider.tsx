import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

const STORAGE_KEY = "azelle.user";
const AuthContext = createContext<AuthContextValue | null>(null);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function loadUser(): User | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed === "object" && "email" in parsed && "name" in parsed) return parsed as User;
  } catch {
    // Ignore malformed or unavailable storage.
  }
  return null;
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "Guest";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; the session lasts for this visit only.
    }
  }, [user]);

  const complete = useCallback((next: User) => {
    setUser(next);
    setAuthOpen(false);
    const continuation = pending.current;
    pending.current = null;
    continuation?.();
  }, []);

  // Stubs: validate, then resolve to a local user after ~400ms. Swap for the real auth API.
  const login = useCallback(
    async (email: string, password: string) => {
      await delay(400);
      if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
      if (password.length < 8) throw new Error("Your password must be at least 8 characters.");
      complete({ name: nameFromEmail(email), email });
    },
    [complete],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, phone: string) => {
      await delay(400);
      if (name.trim().length < 2) throw new Error("Enter your full name.");
      if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
      if (!INDIAN_MOBILE_RE.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
      if (!PASSWORD_RULE.test(password)) throw new Error("Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.");
      complete({ name: name.trim(), email, phone });
    },
    [complete],
  );

  const logout = useCallback(() => setUser(null), []);

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
