import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { fieldClass, labelClass } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "../AdminAuthProvider";
import { AdminSplash } from "../AdminLayout";

const NOTICES: Record<string, string> = {
  idle: "You were signed out after 10 minutes of inactivity.",
  expired: "Your session has expired. Please sign in again.",
};

// Only allow redirects back into the admin area.
function safeNext(value: string | null) {
  return value && value.startsWith("/admin/") && !value.startsWith("//") && !value.startsWith("/admin/login")
    ? value
    : "/admin";
}

export default function AdminLogin() {
  const { status, login } = useAdminAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const notice = NOTICES[params.get("reason") ?? ""];

  useEffect(() => {
    document.title = "Admin sign in — Azelle";
  }, []);

  if (status === "checking") return <AdminSplash />;
  if (status === "authenticated") return <Navigate to={safeNext(params.get("next"))} replace />;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-bg text-ink lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="hero__bg" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo className="self-start" imgClassName="h-16" taglineClassName="text-[10px] tracking-[0.5em]" />
          <div>
            <p className="font-display text-[clamp(2.5rem,4vw,3.75rem)] leading-[1.05]">Fragrance Beyond Words</p>
            <p className="mt-4 max-w-sm text-lg">Orders, products, customers and analytics — each team member with their own role.</p>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Azelle Fragrances</p>
        </div>
      </aside>

      <main className="admin-shell grid place-items-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <Logo className="lg:hidden" imgClassName="h-12" taglineClassName="text-[9px] tracking-[0.5em]" />
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] lg:mt-0">Admin panel</p>
          <h1 className="admin-title mt-2 font-display text-[2.9rem] leading-none">Sign in</h1>
          <p className="mt-3 text-sm">Use your admin email and password.</p>

          {notice && (
            <p role="status" className="mt-6 rounded-[12px] border border-line bg-surface2 px-4 py-3 text-sm">
              {notice}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="admin-email" className={labelClass}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-[calc(50%+4px)] -translate-y-1/2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-surface2"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-[10px] border-l-4 border-[#b3261e] bg-surface px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <button type="submit" className="abtn abtn-add !h-12 w-full !text-[14px]" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <Link to="/" className="text-link mt-8 text-sm">
            ← Back to the store
          </Link>
        </div>
      </main>
    </div>
  );
}
