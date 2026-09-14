import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type ModalProps = {
  open: boolean;
  onClose: () => void; // keep stable (useCallback)
  label: string;
  children: ReactNode;
  /** Width / shape of the dialog panel (defaults to a narrow card). */
  panelClassName?: string;
};

export function Modal({ open, onClose, label, children, panelClassName = "max-w-md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, onClose, panelRef);

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
        className={`relative w-full ${panelClassName} rounded-[20px] bg-surface text-ink shadow-2xl outline-none transition-[opacity,transform] duration-500 ease-reveal ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
