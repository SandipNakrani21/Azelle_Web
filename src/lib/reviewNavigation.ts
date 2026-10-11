export function scrollToProductSection(name: string) {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-product-section]"));
  const index = sections.findIndex(el => el.dataset.productSection === name);
  if (index < 0) return;
  window.dispatchEvent(new CustomEvent("product-section-open", { detail: name }));
  const target = sections[index];
  let frame = 0;
  const scroll = () => {
    if (!sections.slice(0, index + 1).every(el => el.dataset.sectionReady === "true")) return;
    observer.disconnect();
    window.clearTimeout(expiry);
    frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  };
  const observer = new MutationObserver(scroll);
  observer.observe(target.parentElement!, { attributes: true, attributeFilter: ["data-section-ready"], subtree: true });
  const expiry = window.setTimeout(() => observer.disconnect(), 15000);
  scroll();
  return () => { observer.disconnect(); window.clearTimeout(expiry); cancelAnimationFrame(frame); };
}

export function scrollToReviews() { scrollToProductSection("reviews"); }
