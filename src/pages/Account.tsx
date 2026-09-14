import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Ornament } from "@/components/ui/Ornament";
import { useAuth } from "@/providers/AuthProvider";

// Customer account: profile + quick actions when signed in, otherwise a prompt to log in or sign up.
export default function AccountPage() {
  const { user, openAuth, logout } = useAuth();

  useEffect(() => {
    document.title = "Account — Azelle Fragrances";
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="hero__bg opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-[760px] px-6 pb-40 pt-[calc(var(--header-h)+3rem)] md:px-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.16em]">
          <Link to="/" className="text-link">
            Home
          </Link>{" "}
          / <span className="font-semibold">Account</span>
        </nav>
        <p className="section-sub mt-10">Our House</p>
        <Ornament align="left" className="my-3" />
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.05]">Account</h1>

        {user ? (
          <div className="mt-10 rounded-[20px] border border-line bg-surface p-7 md:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Signed in as</p>
            <p className="mt-2 font-display text-3xl">{user.name}</p>
            <p className="mt-1 break-all">{user.email}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pages/order-tracking" className="btn btn-primary">
                Track an order
              </Link>
              <button type="button" className="btn btn-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-[20px] border border-line bg-surface p-7 md:p-9">
            <p className="font-display text-3xl">Welcome to Azelle</p>
            <p className="mt-3 leading-relaxed">Log in or create an account for a faster checkout and easy order tracking.</p>
            <button type="button" className="btn btn-primary mt-8" onClick={() => openAuth()}>
              Login &amp; Signup
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
