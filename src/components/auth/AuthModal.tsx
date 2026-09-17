import { useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, CloseIcon, MailIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { Modal } from "@/components/ui/Modal";
import { Ornament } from "@/components/ui/Ornament";
import { EMAIL_RE, INDIAN_MOBILE_RE, PASSWORD_RULE, useAuth } from "@/providers/AuthProvider";

type Mode = "signin" | "signup";

const BENEFITS = ["Faster checkout with saved details", "Track your orders and deliveries", "Early access to new launches and offers"];
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;

// Sizes scale with the window height (vh), so the whole Create Account form fits without scrolling.
const labelCls = "mb-[clamp(3px,0.7vh,7px)] block text-[clamp(10px,1.35vh,11.5px)] font-semibold uppercase tracking-[0.14em]";
const inputCls =
  "h-[clamp(38px,5.2vh,48px)] w-full rounded-[10px] border bg-surface text-[clamp(13.5px,1.75vh,15.5px)] text-ink outline-none transition-colors duration-300 placeholder:text-soft focus:border-ink focus:ring-1 focus:ring-ink";
const gapY = "gap-y-[clamp(8px,1.7vh,18px)]";

const PASSWORD_CHECKS: { label: string; test: (v: string) => boolean }[] = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "Uppercase", test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase", test: (v) => /[a-z]/.test(v) },
  { label: "Number", test: (v) => /\d/.test(v) },
  { label: "Symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

// Label + control + (error message | hint). Errors are announced and linked with aria-describedby.
function FieldBlock({ id, label, error, hint, children, className = "" }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
        <span aria-hidden="true" className="ml-0.5 text-[#b3261e]">
          *
        </span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[12px] font-semibold leading-snug text-[#b3261e]">
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}

// Input with an optional grey add-on box on the left (icon / icon + fixed +91) and a
// trailing show-password toggle. With an add-on, the border and focus ring wrap both parts.
function TextInput({
  id,
  invalid,
  leading,
  password = false,
  inputRef,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  invalid?: boolean;
  leading?: ReactNode;
  password?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [show, setShow] = useState(false);
  const shared = {
    ...input,
    id,
    ref: inputRef,
    type: password ? (show ? "text" : "password") : input.type,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${id}-error` : input["aria-describedby"],
  };

  if (leading) {
    return (
      <div
        className={`flex h-[clamp(38px,5.2vh,48px)] overflow-hidden rounded-[10px] border bg-surface transition-colors duration-300 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink ${
          invalid ? "border-[#b3261e]" : "border-line"
        }`}
      >
        {/* Grey, non-editable add-on (reads like a disabled field segment) */}
        <span className="flex shrink-0 select-none items-center gap-2 border-r border-line bg-surface2 px-3 text-[clamp(13.5px,1.75vh,15px)] font-semibold text-[#6f6557]" aria-hidden="true">
          {leading}
        </span>
        <input
          {...shared}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[clamp(13.5px,1.75vh,15.5px)] text-ink outline-none placeholder:text-soft"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <input {...shared} className={`${inputCls} pl-4 ${password ? "pr-11" : "pr-4"} ${invalid ? "border-[#b3261e]" : "border-line"}`} />
      {password && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-1.5 my-auto grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 hover:bg-surface2 lg:h-8 lg:w-8"
        >
          <EyeIcon off={show} />
        </button>
      )}
    </div>
  );
}

type SignupValues = { firstName: string; lastName: string; email: string; phone: string; password: string; confirm: string; terms: boolean };
const EMPTY_SIGNUP: SignupValues = { firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "", terms: false };

function validateSignup(v: SignupValues): Partial<Record<keyof SignupValues, string>> {
  const errors: Partial<Record<keyof SignupValues, string>> = {};
  const first = v.firstName.trim();
  const last = v.lastName.trim();
  if (!first) errors.firstName = "Enter your first name.";
  else if (first.length < 2 || !NAME_RE.test(first)) errors.firstName = "Use letters only (at least 2).";
  if (!last) errors.lastName = "Enter your last name.";
  else if (!NAME_RE.test(last)) errors.lastName = "Use letters only.";
  if (!v.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email, e.g. name@example.com.";
  if (!v.phone) errors.phone = "Enter your mobile number.";
  else if (!INDIAN_MOBILE_RE.test(v.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number starting with 6–9.";
  if (!v.password) errors.password = "Create a password.";
  else if (!PASSWORD_RULE.test(v.password)) errors.password = "Password doesn't meet all the requirements below.";
  if (!v.confirm) errors.confirm = "Re-enter your password.";
  else if (v.confirm !== v.password) errors.confirm = "The passwords don't match.";
  if (!v.terms) errors.terms = "Please accept the Terms & Conditions and Privacy Policy.";
  return errors;
}

// Account dialog: narrow brand panel (desktop) + sign-in / create-account forms.
// ⚠ Accounts are a front-end stub (stored on this device) until the customer auth API is connected.
export function AuthModal() {
  const { isAuthOpen, closeAuth, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinTouched, setSigninTouched] = useState(false);
  const [values, setValues] = useState<SignupValues>(EMPTY_SIGNUP);
  const [touched, setTouched] = useState<Partial<Record<keyof SignupValues, boolean>>>({});
  const fieldRefs = useRef<Partial<Record<keyof SignupValues, HTMLInputElement | null>>>({});
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fid = (key: string) => `${uid}-${key}`;
  const isSignIn = mode === "signin";

  const resetAll = () => {
    setError("");
    setNotice("");
    setLoading(false);
    setSigninEmail("");
    setSigninPassword("");
    setSigninTouched(false);
    setValues(EMPTY_SIGNUP);
    setTouched({});
  };

  useEffect(() => {
    if (isAuthOpen) resetAll();
  }, [isAuthOpen]);

  const switchMode = (next: Mode) => {
    resetAll();
    setMode(next);
  };

  const errors = validateSignup(values);
  const showError = (key: keyof SignupValues) => (touched[key] ? errors[key] : undefined);
  const set = <K extends keyof SignupValues>(key: K, value: SignupValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const blur = (key: keyof SignupValues) => () => setTouched((t) => ({ ...t, [key]: true }));

  const signinErrors = {
    email: !signinEmail.trim() ? "Enter your email address." : !EMAIL_RE.test(signinEmail.trim()) ? "Enter a valid email address." : undefined,
    password: !signinPassword ? "Enter your password." : signinPassword.length < 8 ? "Your password has at least 8 characters." : undefined,
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (isSignIn) {
      setSigninTouched(true);
      if (signinErrors.email || signinErrors.password) return;
    } else {
      setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirm: true, terms: true });
      const firstInvalid = (Object.keys(errors) as (keyof SignupValues)[])[0];
      if (firstInvalid) {
        fieldRefs.current[firstInvalid]?.focus();
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignIn) await login(signinEmail.trim(), signinPassword);
      else await signup(`${values.firstName.trim()} ${values.lastName.trim()}`, values.email.trim(), values.password, values.phone);
      resetAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const checkbox = "mt-[3px] h-4 w-4 shrink-0";
  const gradientHeading = {
    backgroundImage: "var(--menu-gradient)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as const;

  return (
    <Modal
      open={isAuthOpen}
      onClose={closeAuth}
      label={isSignIn ? "Sign in to your Azelle account" : "Create an Azelle account"}
      panelClassName="max-w-[980px] overflow-hidden"
    >
      <div className="grid md:max-h-[calc(100dvh-2rem)] md:grid-cols-[minmax(0,7fr)_minmax(0,13fr)]">
        {/* Brand panel — tablet and desktop */}
        <aside className="relative hidden flex-col overflow-hidden px-8 py-[clamp(20px,4vh,40px)] md:flex">
          <div className="hero__bg" aria-hidden="true" />
          <div className="relative flex justify-center">
            <Logo imgClassName="h-[clamp(40px,6vh,56px)]" taglineClassName="text-[10px] tracking-[0.5em]" />
          </div>
          {/* Centred tagline, separator and benefits (same for sign in and sign up) */}
          <div className="relative my-auto py-6 text-center">
            <p className="hero-tagline text-[clamp(1.35rem,3vh,1.75rem)] font-bold leading-[1.15] text-white" style={{ textShadow: "0 2px 16px rgba(27,24,21,.35)" }}>
              Fragrance Beyond Words
            </p>
            <Ornament tone="light" className="my-[clamp(12px,2.2vh,22px)]" />
            <ul className="mx-auto w-fit space-y-[clamp(8px,1.4vh,14px)] text-left">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-[clamp(13px,1.7vh,14.5px)] leading-snug">
                  <CheckCircleIcon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-center text-[10.5px] font-semibold uppercase tracking-[0.2em]">Made in India · Cruelty free</p>
        </aside>

        {/* Forms — content height follows the window height; scrolls only on very short screens */}
        <div className="relative max-h-[calc(100svh-5rem)] overflow-y-auto px-5 py-[clamp(18px,3.2vh,34px)] sm:max-h-[calc(100dvh-2rem)] sm:px-[clamp(24px,3vw,40px)]">
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line bg-bg transition-colors duration-300 hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:h-9 lg:w-9"
          >
            <CloseIcon width={16} height={16} />
          </button>

          <div className="px-10 text-center">
            <Logo className="mb-3 md:hidden" imgClassName="h-9" taglineClassName="text-[8px] tracking-[0.5em]" />
            <h2 className="pb-[0.1em] font-display text-[clamp(1.6rem,4vh,2.35rem)] font-bold leading-tight" style={gradientHeading}>
              {isSignIn ? "Welcome Back" : "Join The House"}
            </h2>
          </div>

          <div role="tablist" aria-label="Account" className="mx-auto mt-[clamp(10px,1.8vh,18px)] grid max-w-[440px] grid-cols-2 gap-1 rounded-full border border-line bg-bg p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`h-[clamp(34px,4.6vh,42px)] whitespace-nowrap rounded-full px-3 text-[clamp(11px,1.4vh,12px)] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
                  mode === m ? "bg-ink text-bg" : "hover:bg-surface2"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form key={mode} onSubmit={onSubmit} noValidate className={`mt-[clamp(12px,2.2vh,22px)] grid grid-cols-1 gap-x-4 ${gapY} sm:grid-cols-2`}>
            {isSignIn ? (
              <>
                <FieldBlock id={fid("email")} label="Email address" error={signinTouched ? signinErrors.email : undefined} className="sm:col-span-2">
                  <TextInput
                    id={fid("email")}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    onBlur={() => setSigninTouched(true)}
                    invalid={signinTouched && Boolean(signinErrors.email)}
                    leading={<MailIcon width={18} height={18} aria-hidden="true" />}
                  />
                </FieldBlock>
                <FieldBlock id={fid("password")} label="Password" error={signinTouched ? signinErrors.password : undefined} className="sm:col-span-2">
                  <TextInput
                    id={fid("password")}
                    name="password"
                    password
                    autoComplete="current-password"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    invalid={signinTouched && Boolean(signinErrors.password)}
                  />
                </FieldBlock>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                    <input type="checkbox" name="remember" defaultChecked className="h-4 w-4" style={{ accentColor: "var(--ink)" }} />
                    Keep me signed in
                  </label>
                  <button
                    type="button"
                    onClick={() => setNotice("Password reset by email is coming soon. For help right now, please contact our team.")}
                    className="text-link py-1 text-[14px] font-semibold lg:py-0"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <FieldBlock id={fid("first")} label="First name" error={showError("firstName")}>
                  <TextInput
                    id={fid("first")}
                    name="firstName"
                    autoComplete="given-name"
                    placeholder="First name"
                    maxLength={40}
                    value={values.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    onBlur={blur("firstName")}
                    invalid={Boolean(showError("firstName"))}
                    inputRef={(el) => (fieldRefs.current.firstName = el)}
                  />
                </FieldBlock>
                <FieldBlock id={fid("last")} label="Last name" error={showError("lastName")}>
                  <TextInput
                    id={fid("last")}
                    name="lastName"
                    autoComplete="family-name"
                    placeholder="Last name"
                    maxLength={40}
                    value={values.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    onBlur={blur("lastName")}
                    invalid={Boolean(showError("lastName"))}
                    inputRef={(el) => (fieldRefs.current.lastName = el)}
                  />
                </FieldBlock>

                <FieldBlock id={fid("email")} label="Email address" error={showError("email")}>
                  <TextInput
                    id={fid("email")}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={blur("email")}
                    invalid={Boolean(showError("email"))}
                    leading={<MailIcon width={18} height={18} aria-hidden="true" />}
                    inputRef={(el) => (fieldRefs.current.email = el)}
                  />
                </FieldBlock>
                <FieldBlock id={fid("phone")} label="Mobile number" error={showError("phone")}>
                  {/* +91 is fixed: only the 10-digit number can be typed (digits only). */}
                  <TextInput
                    id={fid("phone")}
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={values.phone}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, "");
                      if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
                      set("phone", digits.slice(0, 10));
                    }}
                    onBlur={blur("phone")}
                    invalid={Boolean(showError("phone"))}
                    leading={
                      <>
                        <PhoneIcon />
                        <span>+91</span>
                      </>
                    }
                    inputRef={(el) => (fieldRefs.current.phone = el)}
                  />
                </FieldBlock>

                <FieldBlock id={fid("password")} label="Password" error={showError("password")}>
                  <TextInput
                    id={fid("password")}
                    name="password"
                    password
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(e) => set("password", e.target.value)}
                    onBlur={blur("password")}
                    invalid={Boolean(showError("password"))}
                    aria-describedby={fid("rules")}
                    inputRef={(el) => (fieldRefs.current.password = el)}
                  />
                </FieldBlock>
                <FieldBlock id={fid("confirm")} label="Confirm password" error={showError("confirm")}>
                  <TextInput
                    id={fid("confirm")}
                    name="confirm"
                    password
                    autoComplete="new-password"
                    value={values.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                    onBlur={blur("confirm")}
                    invalid={Boolean(showError("confirm"))}
                    inputRef={(el) => (fieldRefs.current.confirm = el)}
                  />
                </FieldBlock>
                <ul id={fid("rules")} aria-live="polite" className="-mt-[clamp(2px,0.8vh,8px)] flex flex-wrap gap-x-3.5 gap-y-1 text-[clamp(11.5px,1.5vh,12.5px)] sm:col-span-2">
                  {PASSWORD_CHECKS.map((c) => {
                    const ok = c.test(values.password);
                    return (
                      <li key={c.label} className={`flex items-center gap-1 ${ok ? "font-semibold text-[#2f7d4f]" : ""}`}>
                        <span aria-hidden="true">{ok ? "✓" : "•"}</span>
                        {c.label}
                        <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-[clamp(4px,0.9vh,8px)] rounded-[12px] border border-line bg-bg px-3.5 py-[clamp(8px,1.3vh,12px)] sm:col-span-2">
                  <label className="flex cursor-pointer items-start gap-2.5 text-[clamp(12.5px,1.6vh,13.5px)] leading-snug">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={values.terms}
                      onChange={(e) => {
                        set("terms", e.target.checked);
                        setTouched((t) => ({ ...t, terms: true }));
                      }}
                      aria-invalid={Boolean(showError("terms")) || undefined}
                      className={checkbox}
                      style={{ accentColor: "var(--ink)" }}
                    />
                    <span>
                      I am 18 or older and agree to the{" "}
                      <Link to="/pages/terms-and-conditions" onClick={closeAuth} className="text-link font-semibold">
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link to="/pages/privacy-policy" onClick={closeAuth} className="text-link font-semibold">
                        Privacy Policy
                      </Link>
                      .<span aria-hidden="true" className="ml-0.5 text-[#b3261e]">*</span>
                    </span>
                  </label>
                  {showError("terms") && <p className="pl-[26px] text-[12px] font-semibold text-[#b3261e]">{showError("terms")}</p>}
                  {/* Marketing consent is optional and unticked by default (DPDP Act, 2023). */}
                  <label className="flex cursor-pointer items-start gap-2.5 text-[clamp(12.5px,1.6vh,13.5px)] leading-snug">
                    <input type="checkbox" name="marketing" className={checkbox} style={{ accentColor: "var(--ink)" }} />
                    <span>Send me launches and offers by email, SMS or WhatsApp (optional).</span>
                  </label>
                </div>
              </>
            )}

            {notice && (
              <p role="status" className="rounded-[12px] border border-line bg-bg px-4 py-2.5 text-[13.5px] leading-relaxed sm:col-span-2">
                {notice}{" "}
                <Link to="/pages/contact-us" onClick={closeAuth} className="text-link font-semibold">
                  Contact Us
                </Link>
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-[12px] border-l-[3px] border-[#b3261e] bg-[#b3261e]/5 px-4 py-2.5 text-[13.5px] leading-relaxed sm:col-span-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary !h-[clamp(42px,5.8vh,52px)] w-full !text-[clamp(13px,1.7vh,15px)] sm:col-span-2" disabled={loading}>
              {loading ? "One moment…" : isSignIn ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
