import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOverlayPresence } from "@/hooks/useOverlayPresence";

type ModalProps = {
  open: boolean;
  onClose: () => void; // keep stable (useCallback)
  label: string;
  children: ReactNode;
  /** Width / shape of the dialog panel (defaults to a narrow card). */
  panelClassName?: string;
  /**
   * Where the panel comes in from. Storefront dialogs rise from below; every admin form
   * glides in from the right edge towards the centre.
   */
  from?: "bottom" | "right";
};

export function Modal({ open, onClose, label, children, panelClassName = "max-w-md", from = "bottom" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, onClose, panelRef);
  const present = useOverlayPresence(open);
  if (!present) return null;
  const offscreen = from === "right" ? "translate-x-[16vw] opacity-0" : "translate-y-6 opacity-0";

  return (
    <div className={`fixed inset-0 z-[80] grid place-items-center overflow-y-auto p-4 ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        className={`fixed inset-0 bg-black/45 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative w-full ${panelClassName} rounded-[20px] bg-surface text-ink shadow-2xl outline-none transition-[opacity,transform] duration-500 ease-reveal ${
          open ? "translate-x-0 translate-y-0 opacity-100" : offscreen
        }`}
      >
        {children}
      </div>
    </div>
  );
}
