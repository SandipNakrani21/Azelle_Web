// One passive scroll listener, throttled to a single rAF per frame,
// shared by every subscriber (reveal sweep, header state, …).

type Subscriber = (scrollY: number) => void;

const subscribers = new Set<Subscriber>();
let frame = 0;

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const y = window.scrollY;
    subscribers.forEach((fn) => fn(y));
  });
}

export function subscribeScroll(fn: Subscriber): () => void {
  if (subscribers.size === 0) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  subscribers.add(fn);
  fn(window.scrollY);

  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
