import { useId, type InputHTMLAttributes } from "react";

export const labelClass = "block text-[12px] font-semibold uppercase tracking-[0.16em]";
export const fieldClass =
  "mt-2 h-12 w-full rounded-[10px] border border-line bg-surface px-4 text-base text-ink outline-none transition-colors duration-500 placeholder:text-soft focus:border-ink focus:ring-1 focus:ring-ink";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, id, className = "", required, ...input }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className={labelClass}>
        {label}
        {!required && <span className="ml-1 font-normal normal-case tracking-normal">(optional)</span>}
      </label>
      <input id={fieldId} required={required} {...input} className={fieldClass} />
    </div>
  );
}
