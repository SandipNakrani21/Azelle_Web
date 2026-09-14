import type { CSSProperties } from "react";

// Stagger position for a [data-reveal] element (75ms per step).
export const revealOrder = (order: number): CSSProperties => ({ "--order": order }) as CSSProperties;
