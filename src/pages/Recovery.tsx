import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
export default function Recovery() {
  const location = useLocation();
  const reset = location.pathname === "/reset-password";
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setError("");
    setMessage("");
    if (reset && fields.password !== fields.confirm) {
      setError("The passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ message: string }>(
        `/api/account/${reset ? "reset-password" : "forgot-password"}`,
        {
          method: "POST",
          json: reset
            ? {
                password: fields.password,
                token: new URLSearchParams(location.search).get("token"),
              }
            : { email: fields.email },
        },
      );
      setMessage(result.message);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="recovery-page">
      <h1 className="font-display text-4xl">
        {reset ? "Choose a new password" : "Reset your password"}
      </h1>
      <p className="my-5">
        {reset
          ? "Use at least 8 characters with uppercase, lowercase, a number and a symbol."
          : "Enter your account email to receive a secure reset link."}
      </p>
      <form onSubmit={submit} className="grid gap-4">
        {reset ? (
          <>
            <label>
              New password
              <input
                className="field w-full"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                className="field w-full"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
          </>
        ) : (
          <label>
            Email address
            <input
              className="field w-full"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Please wait…" : reset ? "Save password" : "Send reset link"}
        </button>
        {error && (
          <p role="alert">
            {error} <Link to="/pages/contact-us">Contact support</Link>
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </form>
      <Link className="text-link inline-block mt-6" to="/account">
        Back to your account
      </Link>
    </section>
  );
}
