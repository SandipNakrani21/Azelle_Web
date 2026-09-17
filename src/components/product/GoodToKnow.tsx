import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent, type SVGProps } from "react";
import { Link } from "react-router-dom";
import {
  BottleSmallIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DropletIcon,
  GiftSmallIcon,
  TruckIcon,
} from "@/components/ui/Icons";
import { Ornament } from "@/components/ui/Ornament";
import type { Product } from "@/lib/products";
import { revealOrder } from "@/lib/reveal";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
type Topic = {
  Icon: IconType;
  title: string;
  hint: string;
  body: string;
  points: string[];
  link?: { label: string; to: string };
};

// ⚠ Shipping, returns and ingredient details are typical for an Indian perfume brand — confirm them
// against Azelle's actual policies and formula sheets before launch.
function topicsFor(product: Product): Topic[] {
  const longevity = product.longevity || "6–8 hours";
  const oil = product.perfumeOil != null ? ` with ${product.perfumeOil}% perfume oil` : "";

  return [
    {
      Icon: DropletIcon,
      title: "How to wear",
      hint: "2–3 sprays on pulse points",
      body: `${product.name} is concentrated, so a little goes a long way. Apply it where your skin is warmest and let it settle on its own.`,
      points: [
        "Spray 2–3 times on pulse points: wrists, neck and behind the ears.",
        "Hold the bottle about 15 cm away from your skin.",
        "Don't rub your wrists together — it crushes the top notes.",
        "Apply on moisturised skin straight after a shower for longer wear.",
      ],
    },
    {
      Icon: ClockIcon,
      title: "Longevity & projection",
      hint: `Around ${longevity} on skin`,
      body: `${product.concentration}${oil}. Expect around ${longevity} on skin and even longer on clothing. How long it lasts depends on your skin type, the weather and your day.`,
      points: [
        "Dry skin holds fragrance for less time — moisturise first.",
        "Heat and humidity make it project more but fade sooner.",
        "Your nose gets used to it within minutes; others can still smell it.",
      ],
    },
    {
      Icon: BottleSmallIcon,
      title: "Storage & care",
      hint: "Cool, dry and away from sunlight",
      body: "Light, heat and air are what change a perfume over time. Store it well and it will smell the same on the last spray as on the first.",
      points: [
        "Keep the bottle upright in a cool, dry cupboard or drawer.",
        "Avoid the bathroom — steam and heat alter the scent.",
        "Put the cap back on after every use.",
        "Best used within 36 months of opening.",
      ],
    },
    {
      Icon: TruckIcon,
      title: "Shipping & delivery",
      hint: "Free shipping across India",
      body: "Every order ships free, securely packed so your bottle arrives in perfect condition.",
      points: [
        "Dispatched within 24–48 hours (Monday to Saturday).",
        "Delivered in 3–7 business days, depending on your pin code.",
        "A tracking link is sent by email and SMS as soon as it ships.",
      ],
      link: { label: "Read the shipping policy", to: "/pages/shipping-policy" },
    },
    {
      Icon: GiftSmallIcon,
      title: "Returns & replacements",
      hint: "Damaged or wrong item? We'll fix it",
      body: "Perfume is a personal-care product, so opened or used bottles can't be returned. If something isn't right with your order, we'll make it right.",
      points: [
        "Tell us within 48 hours of delivery if an item is damaged, leaking or incorrect.",
        "Share an unboxing video and photos of the parcel.",
        "We'll send a replacement or issue a full refund.",
      ],
      link: { label: "Read the refund & return policy", to: "/pages/refund-and-return" },
    },
    {
      Icon: CheckCircleIcon,
      title: "Ingredients & safety",
      hint: "Full list and usage guidance",
      body: "Alcohol Denat., Parfum (Fragrance), Aqua (Water). May contain: Limonene, Linalool, Citral, Coumarin, Geraniol.",
      points: [
        "For external use only. Avoid contact with eyes.",
        "Patch test before first use and stop if irritation occurs.",
        "Flammable — keep away from heat and open flame.",
        "Keep out of reach of children.",
      ],
    },
  ];
}

const PROMISES: { Icon: IconType; title: string; text: string }[] = [
  { Icon: TruckIcon, title: "Free shipping", text: "On every order" },
  { Icon: ClockIcon, title: "Fast dispatch", text: "Within 24–48 hours" },
  { Icon: CheckCircleIcon, title: "Safe delivery", text: "Replacement if damaged" },
];

const iconRing = (Icon: IconType, size = 40) => (
  <span className="inline-flex shrink-0 rounded-full p-[2px] shadow-[0_6px_16px_rgba(27,24,21,.1)]" style={{ background: "var(--button-gradient)" }} aria-hidden="true">
    <span
      className="grid place-items-center rounded-full bg-surface"
      style={{ width: size, height: size, color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" }}
    >
      <Icon width={size / 2} height={size / 2} />
    </span>
  </span>
);

// The text under a topic's header — shared by the desktop panel and the mobile accordion.
function TopicDetail({ topic }: { topic: Topic }) {
  return (
    <>
      <p className="text-[15.5px] leading-[1.8]">{topic.body}</p>
      <ul className="mt-3 space-y-2">
        {topic.points.map((point) => (
          <li key={point} className="flex gap-3 text-[15px] leading-[1.7]">
            <span className="mt-[0.75em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      {topic.link && (
        <Link to={topic.link.to} className="text-link mt-4 text-sm font-semibold uppercase tracking-[0.14em]">
          {topic.link.label} →
        </Link>
      )}
    </>
  );
}

function Promises({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3 ${className}`}>
      {PROMISES.map(({ Icon, title, text }) => (
        <li key={title} className="flex items-center gap-3">
          {iconRing(Icon, 34)}
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">{title}</span>
            <span className="mt-0.5 block text-[13px] leading-snug">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Both rows share one column template so their edges line up.
const rowGrid = "grid items-stretch gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10";

// Product page "Good to know".
// Row 1: intro beside the "Need help choosing?" card (same height).
// Row 2: the six topics as vertical tabs on the left; hovering, clicking or focusing one shows its
// details in the panel on the right. Both columns stretch to the taller one, so they stay level.
export function GoodToKnow({ product }: { product: Product }) {
  const topics = topicsFor(product);
  const [active, setActive] = useState(0);
  // Phones and tablets: which accordion row is open (-1 = all closed).
  const [openRow, setOpenRow] = useState(0);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const topic = topics[active];

  useEffect(() => {
    setActive(0);
    setOpenRow(0);
  }, [product.id]);

  // Arrow keys / Home / End move between tabs (roving focus).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = -1;
    if (e.key in step) next = (active + step[e.key] + topics.length) % topics.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = topics.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="details-h" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
        {/* Row 1 — intro + help card */}
        <div className={rowGrid}>
          <div data-reveal="slide" className="flex flex-col justify-center">
            <p className="section-sub">Good to know</p>
            <Ornament align="left" className="mb-4 mt-2" />
            <h2 id="details-h" className="section-title">
              Wear it well
            </h2>
            <p className="mt-4 text-[16px] leading-[1.85]">
              Everything you need to enjoy {product.name} at its best — how to apply it, how long it lasts, and what to expect when your order arrives.
            </p>
          </div>

          <div
            data-reveal="slide"
            style={revealOrder(1)}
            className="flex flex-col justify-center rounded-[24px] border border-line bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] px-7 py-6 md:px-9 md:py-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
              <div className="max-w-[440px]">
                <p className="font-display text-[1.75rem] leading-tight">Need help choosing?</p>
                <p className="mt-3 text-[16px] leading-[1.8]">Our fragrance team replies within one business day with personal recommendations.</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link to="/pages/contact-us" className="btn btn-primary !h-12 !min-w-0 !px-7">
                  Contact Us
                </Link>
                <Link to="/pages/help" className="text-link text-sm font-semibold uppercase tracking-[0.14em]">
                  Visit Help
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — topic tabs + details panel */}
        {/* Row 2 (desktop) — topic tabs on the left, details panel on the right */}
        <div className="mt-6 hidden items-stretch gap-6 lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10">
          <div role="tablist" aria-orientation="vertical" aria-label="Good to know topics" onKeyDown={onKeyDown} className="flex flex-col gap-2.5">
            {topics.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.title}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`${uid}-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`${uid}-panel`}
                  tabIndex={on ? 0 : -1}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={`flex flex-1 items-center gap-4 rounded-[16px] border px-5 py-3 text-left transition-[transform,box-shadow,border-color] duration-500 ${
                    on
                      ? "border-white/70 shadow-[0_14px_30px_rgba(27,24,21,.14)] lg:translate-x-1.5"
                      : "border-line bg-bg hover:border-[color-mix(in_oklab,var(--ink)_30%,transparent)]"
                  }`}
                  // Hovered / selected topic: the footer's background gradient.
                  style={on ? { background: "var(--brand-gradient)" } : undefined}
                >
                  {iconRing(t.Icon)}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold uppercase tracking-[0.16em]">{t.title}</span>
                    <span className="mt-1 block text-[14px]">{t.hint}</span>
                  </span>
                  <ChevronRightIcon
                    width={18}
                    height={18}
                    aria-hidden="true"
                    className={`shrink-0 transition-[transform,opacity] duration-500 ${on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-35"}`}
                  />
                </button>
              );
            })}
          </div>

          <div
            id={`${uid}-panel`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${active}`}
            className="flex flex-col rounded-[24px] border border-line bg-bg px-7 py-6 shadow-[0_18px_40px_rgba(27,24,21,.08)] md:px-8 md:py-7"
          >
            <div key={active} className="animate-[fadeIn_0.45s_ease-out] pb-5">
              <div className="flex items-center gap-4">
                {iconRing(topic.Icon, 46)}
                <div>
                  <h3 className="font-display text-[1.7rem] leading-tight">{topic.title}</h3>
                  <p className="mt-0.5 text-[14px]">{topic.hint}</p>
                </div>
              </div>
              <Ornament align="left" className="my-4" />
              <TopicDetail topic={topic} />
            </div>

            {/* Brand promises, pinned to the bottom of the panel */}
            <Promises className="mt-auto" />
          </div>
        </div>

        {/* Row 2 (phones and tablets) — the same topics as an accordion, so the details a visitor
            taps open inside that card instead of in a panel below the whole list. */}
        <div className="mt-6 flex flex-col gap-2.5 lg:hidden">
          {topics.map((t, i) => {
            const open = i === openRow;
            return (
              <div
                key={t.title}
                className={`overflow-hidden rounded-[16px] border transition-[border-color,box-shadow] duration-500 ${
                  open ? "border-white/70 shadow-[0_14px_30px_rgba(27,24,21,.14)]" : "border-line bg-bg"
                }`}
                style={open ? { background: "var(--brand-gradient)" } : undefined}
              >
                <button
                  type="button"
                  id={`${uid}-acc-tab-${i}`}
                  aria-expanded={open}
                  aria-controls={`${uid}-acc-panel-${i}`}
                  onClick={() => setOpenRow(open ? -1 : i)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left"
                >
                  {iconRing(t.Icon)}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold uppercase tracking-[0.16em]">{t.title}</span>
                    <span className="mt-1 block text-[14px]">{t.hint}</span>
                  </span>
                  <ChevronDownIcon
                    width={18}
                    height={18}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-500 ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div
                    id={`${uid}-acc-panel-${i}`}
                    role="region"
                    aria-labelledby={`${uid}-acc-tab-${i}`}
                    className="animate-[fadeIn_0.35s_ease-out] border-t border-white/50 bg-bg px-5 py-5"
                  >
                    <TopicDetail topic={t} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-2 rounded-[16px] border border-line bg-bg px-5 py-4">
            <Promises className="border-t-0 pt-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
