import { type ReactNode } from "react";

/** Text is always rendered. Browser rendering containment and lazy media do the deferring. */
export function ScrollSection({name, height: _height, children}: {name: string; height: number; children: ReactNode}) {
 return <div data-product-section={name} data-section-ready="true" className="product-scroll-section"><div className="product-section-content">{children}</div></div>;
}
