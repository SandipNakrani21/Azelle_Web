import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type DrawerProps = {
  open: boolean;
  onClose: () => void; // keep stable (useCallback)
  label: string;
  side?: "left" | "right";
  children: ReactNode;
  /** Panel width (defaults to a 448px sheet). */
  panelClassName?: string;
};

export function Drawer({ open, onClose, label, side = "right", children, panelClassName = "w-full max-w-md" }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, onClose, panelRef);

  const offscreen = side === "right" ? "translate-x-full" : "-translate-x-full";

  return (
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute inset-y-0 ${side === "right" ? "right-0" : "left-0"} ${panelClassName} bg-surface text-ink shadow-2xl outline-none transition-transform duration-500 ease-reveal ${open ? "translate-x-0" : offscreen}`}
      >
        {children}
      </div>
    </div>
  );
}
