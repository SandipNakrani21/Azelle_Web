import { useId, type InputHTMLAttributes } from "react";

export const labelClass = "block text-[12px] font-semibold uppercase tracking-[0.16em]";
export const fieldClass =
  "mt-2 h-12 w-full rounded-[10px] border border-line bg-surface px-4 text-base text-ink outline-none transition-colors duration-500 placeholder:text-soft focus:border-ink focus:ring-1 focus:ring-ink";
export const fieldErrorClass = "mt-1.5 text-[13px] text-[#b3261e]";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Field({ label, id, className = "", required, error, ...input }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className={labelClass}>
        {label}
        {!required && <span className="ml-1 font-normal normal-case tracking-normal">(optional)</span>}
      </label>
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
        className={`${fieldClass} ${error ? "!border-[#b3261e]" : ""}`}
      />
      {error && (
        <p id={errorId} className={fieldErrorClass}>
          {error}
        </p>
      )}
    </div>
  );
}
