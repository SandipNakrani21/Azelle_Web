import { useEffect, useRef, useState } from "react";
import { UserIcon } from "@/components/ui/Icons";
import { useAuth } from "@/providers/AuthProvider";

export function AccountMenu() {
  const { user, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <button type="button" className="icon-btn" onClick={() => openAuth()} aria-label="Sign in">
        <UserIcon />
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Account, signed in as ${user.name}`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-display text-sm text-bg">
          {user.name[0]?.toUpperCase()}
        </span>
      </button>
      {open && (
        <div
          id="account-menu"
          className="menu-panel absolute right-0 top-full mt-2 w-64 rounded-[14px] border border-line bg-surface p-5 text-left shadow-[0_12px_24px_rgba(0,0,0,.12)]"
        >
          <p className="font-display text-xl">{user.name}</p>
          <p className="break-all text-sm">{user.email}</p>
          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              className="link-underline"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
