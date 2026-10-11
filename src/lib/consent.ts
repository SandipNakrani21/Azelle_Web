const KEY = "azelle.analytics-consent";
export function analyticsConsent() {
  try {
    return localStorage.getItem(KEY) === "accepted";
  } catch {
    return false;
  }
}
export function consentChosen() {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
export function setAnalyticsConsent(accepted: boolean) {
  try {
    localStorage.setItem(KEY, accepted ? "accepted" : "declined");
    if (!accepted) {
      localStorage.removeItem("azelle.visitor");
      localStorage.removeItem("azelle.visit.identity");
      sessionStorage.removeItem("azelle.visit.session");
    }
  } catch {
    /* Storage may be unavailable. Tracking stays off. */
  }
  window.dispatchEvent(new Event("azelle-consent-change"));
}
