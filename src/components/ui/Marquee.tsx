type MarqueeProps = {
  items: string[];
  className?: string;
  /** Seconds per loop. */
  duration?: number;
};

// Two identical groups each translate -100% of their own width, so the loop is seamless.
export function Marquee({ items, className = "", duration = 20 }: MarqueeProps) {
  const group = (
    <ul className="marquee__group" style={{ animationDuration: `${duration}s` }}>
      {[...items, ...items].map((item, i) => (
        <li key={i} className="marquee-text">
          {item}
          <span aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={className}>
      <p className="sr-only">{items.join(" · ")}</p>
      <div className="marquee" aria-hidden="true">
        {group}
        {group}
      </div>
    </div>
  );
}
