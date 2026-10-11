import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  analyticsConsent,
  consentChosen,
  setAnalyticsConsent,
} from "@/lib/consent";
export function ConsentNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!consentChosen()), []);
  function choose(accepted: boolean) {
    const previouslyAccepted = analyticsConsent();
    setAnalyticsConsent(accepted);
    setOpen(false);
    if (previouslyAccepted && !accepted) window.location.reload();
  }
  return (
    <>
      <button
        className="footer-link mx-auto block min-h-11"
        onClick={() => setOpen(true)}
      >
        Privacy preferences
      </button>
      {open && (
        <aside className="consent-notice" aria-label="Privacy preferences">
          <p>
            We use essential storage for your cart and account. With your
            permission, analytics help us improve the shopping experience. If
            you sign in, visit analytics may be linked to your account.{" "}
            <Link to="/pages/privacy-policy" className="text-link">
              Privacy policy
            </Link>
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button className="btn btn-secondary" onClick={() => choose(false)}>
              Essential only
            </button>
            <button className="btn btn-primary" onClick={() => choose(true)}>
              Allow analytics
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
