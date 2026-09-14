import { MinusIcon, PlusIcon } from "./Icons";

type QtyStepperProps = {
  value: number;
  onInc: () => void;
  onDec: () => void;
  label: string;
  /** "lg" matches the 52px primary button; "compact" is 44px with square corners (product size row). */
  size?: "md" | "lg" | "compact";
  /** Stretch to fill its grid cell (the − / value / + split the width evenly). */
  fullWidth?: boolean;
  decDisabled?: boolean;
  incDisabled?: boolean;
};

export function QtyStepper({ value, onInc, onDec, label, size = "md", fullWidth, decDisabled, incDisabled }: QtyStepperProps) {
  const lg = size === "lg";
  const boxed = size !== "md";
  const cell = fullWidth ? "flex-1" : lg ? "w-12" : "w-11";
  const control = `grid place-items-center transition-colors duration-300 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${cell}`;
  const frame = lg ? "h-[52px] rounded-[10px] border-ink" : boxed ? "h-11 rounded-[10px] border-ink" : "h-11 rounded-full border-line";

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex shrink-0 items-stretch overflow-hidden border bg-surface ${fullWidth ? "w-full" : ""} ${frame}`}
    >
      <button type="button" onClick={onDec} disabled={decDisabled} aria-label="Decrease quantity" className={control}>
        <MinusIcon />
      </button>
      <span
        aria-live="polite"
        className={`grid place-items-center tabular-nums ${lg ? "border-x border-line text-base font-semibold" : ""} ${fullWidth ? "flex-1" : lg ? "w-12" : "w-8"}`}
      >
        {value}
      </span>
      <button type="button" onClick={onInc} disabled={incDisabled} aria-label="Increase quantity" className={control}>
        <PlusIcon />
      </button>
    </div>
  );
}
