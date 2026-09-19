import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/lib/api";
import { adminApi, type AdminSession, type Permission } from "./adminApi";

export type SignOutReason = "manual" | "idle" | "expired";
type AuthStatus = "checking" | "authenticated" | "anonymous";

type AdminAuthValue = {
  status: AuthStatus;
  email: string;
  /** Signed-in admin (name, role, permissions) — null until known. */
  admin: AdminSession | null;
  /** RBAC check, e.g. can("orders.manage"). */
  can: (...permissions: Permission[]) => boolean;
  idleTimeoutMs: number;
  login: (email: string, password: string) => Promise<void>;
  logout: (reason?: SignOutReason) => Promise<void>;
  /** Wraps an admin API call; a 401 signs the admin out with an "expired" notice. */
  guard: <T>(request: Promise<T>) => Promise<T>;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

const DEFAULT_IDLE_MS = 10 * 60 * 1000;
const KEEPALIVE_EVERY_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Session-based admin auth. The server session is rolling (10 minutes since the last request);
 * this provider mirrors that in the browser: real activity pings the server at most every 30s,
 * and 10 minutes without activity signs the admin out.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(DEFAULT_IDLE_MS);
  const lastActivityAt = useRef(Date.now());
  const lastKeepAliveAt = useRef(Date.now());
  const signingOut = useRef(false);

  // Restore an existing session.
  useEffect(() => {
    let cancelled = false;
    adminApi.session().then(
      (session) => {
        if (cancelled) return;
        lastActivityAt.current = Date.now();
        setEmail(session.email);
        setAdmin(session);
        setIdleTimeoutMs(session.idleTimeoutMs);
        setStatus("authenticated");
      },
      () => {
        if (!cancelled) setStatus("anonymous");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const signOutLocally = useCallback(
    (reason: SignOutReason) => {
      navigate(reason === "manual" ? "/admin/login" : `/admin/login?reason=${reason}`, { replace: true });
      setEmail("");
      setAdmin(null);
      setStatus("anonymous");
    },
    [navigate],
  );

  const logout = useCallback(
    async (reason: SignOutReason = "manual") => {
      if (signingOut.current) return;
      signingOut.current = true;
      try {
        await adminApi.logout();
      } catch {
        // Already signed out on the server.
      }
      signOutLocally(reason);
      signingOut.current = false;
    },
    [signOutLocally],
  );

  const login = useCallback(async (loginEmail: string, password: string) => {
    const session = await adminApi.login(loginEmail, password);
    const now = Date.now();
    lastActivityAt.current = now;
    lastKeepAliveAt.current = now;
    setEmail(session.email);
    setAdmin(session);
    setIdleTimeoutMs(session.idleTimeoutMs);
    setStatus("authenticated");
  }, []);

  const guard = useCallback(
    async <T,>(request: Promise<T>): Promise<T> => {
      try {
        const result = await request;
        lastKeepAliveAt.current = Date.now();
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) signOutLocally("expired");
        throw err;
      }
    },
    [signOutLocally],
  );

  // Inactivity tracking while signed in.
  useEffect(() => {
    if (status !== "authenticated") return;

    const onActivity = () => {
      const now = Date.now();
      lastActivityAt.current = now;
      if (now - lastKeepAliveAt.current < KEEPALIVE_EVERY_MS) return;
      lastKeepAliveAt.current = now;
      // Keep-alive also refreshes the role, so permission changes apply without signing out.
      adminApi.session().then(setAdmin, (err) => {
        if (err instanceof ApiError && err.status === 401) signOutLocally("expired");
      });
    };

    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityAt.current >= idleTimeoutMs) void logout("idle");
    }, 5000);

    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity);
      window.clearInterval(timer);
    };
  }, [status, idleTimeoutMs, logout, signOutLocally]);

  const can = useCallback((...permissions: Permission[]) => Boolean(admin && permissions.some((p) => admin.permissions.includes(p))), [admin]);

  const value = useMemo<AdminAuthValue>(
    () => ({ status, email, admin, can, idleTimeoutMs, login, logout, guard }),
    [status, email, admin, can, idleTimeoutMs, login, logout, guard],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return ctx;
}
