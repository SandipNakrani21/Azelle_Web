import { Link } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { CameraIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { linkState, NAV_SECTIONS } from "@/lib/navigation";
import { Ornament } from "@/components/ui/Ornament";
import { useAuth } from "@/providers/AuthProvider";

// Same sections as the header menu (src/lib/navigation.ts).
const COLUMNS = NAV_SECTIONS;

const SOCIAL = [
  { label: "Instagram", Icon: CameraIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "WhatsApp", Icon: WhatsAppIcon },
];

// Column heading followed by the same line — ✦ — line rule used under section titles.
function ColumnHeading({ children, small = false }: { children: string; small?: boolean }) {
  return (
    <>
      <h3 className={`font-bold uppercase ${small ? "text-[13px] tracking-[0.18em]" : "text-[16px] tracking-[0.18em]"}`}>{children}</h3>
      <div className={`mt-3 ${small ? "w-[110px]" : "w-[140px]"}`}>
        <Ornament align="left" wide tone="light" />
      </div>
    </>
  );
}

/** `flush`: no top margin — for pages whose own background continues right up to the footer. */
export function Footer({ flush = false }: { flush?: boolean }) {
  const { openAuth } = useAuth();

  return (
    <footer id="footer" className={`relative text-ink ${flush ? "" : "mt-32"}`}>
      <div className="hero__bg" aria-hidden="true" />

      {/* Gradient used by the social icons on hover (referenced from CSS). */}
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="azelle-icon-gradient" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
            <stop offset="0" stopColor="#e6b45a" />
            <stop offset="0.35" stopColor="#e9a58f" />
            <stop offset="0.7" stopColor="#cf8f9c" />
            <stop offset="1" stopColor="#9fc2ad" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bottles standing on the footer's top edge: a slow rocking sway, and a tilt on hover. */}
      {/* Two identical bottles centred on the footer's top edge (half above, half below). They lean in
          from their bases until the tops touch in a cross, then lean out apart — like the reference cans. */}
      <div className="absolute right-[6%] top-0 z-10 flex -translate-y-[64%] items-end" aria-hidden="true">
        <Bottle tint="#e8cf6f" name="Azelle" decorative className="bottle-lean-left h-28 w-auto md:h-40" />
        <Bottle tint="#e3a6a8" name="Azelle" decorative className="bottle-lean-right h-28 w-auto md:h-40" />
      </div>

      {/* Full width: the logo column sits at the left edge, "Others" at the right edge, the rest spaced evenly. */}
      <div className="relative grid gap-x-10 gap-y-12 px-6 pb-14 pt-24 sm:grid-cols-2 md:grid-cols-3 md:px-12 lg:flex lg:justify-between lg:gap-x-12 xl:px-16">
        {/* 1. Logo, tagline, description */}
        <div>
          <Logo imgClassName="h-16" taglineClassName="text-[11px] tracking-[0.5em]" />
          <p className="mt-8 font-display text-xl font-bold">Fragrance Beyond Words</p>
          <p className="mt-5 max-w-[260px] text-[15.5px] leading-[2]">Niche perfume extracts, composed slowly in small batches.</p>
        </div>

        {/* 2–4. Shop, Information, Our house */}
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <ColumnHeading>{col.heading}</ColumnHeading>
            <ul className="mt-5 space-y-3.5 text-[16px]">
              {col.links.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} state={linkState(to)} className="footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* 5. Others: account, help, social */}
        <nav aria-label="Others">
          <ColumnHeading>Others</ColumnHeading>
          <ul className="mt-5 space-y-3.5 text-[16px]">
            <li>
              <Link to="/account" className="footer-link">
                Account
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => openAuth()} className="footer-link text-left">
                Login & Signup
              </button>
            </li>
            <li>
              <Link to="/pages/help" className="footer-link">
                Get Help
              </Link>
            </li>
          </ul>
          <div className="mt-12">
            <ColumnHeading small>Follow us on</ColumnHeading>
          </div>
          <ul className="mt-5 flex gap-3">
            {SOCIAL.map(({ label, Icon }) => (
              <li key={label}>
                <span className="social" title={`${label} — coming soon`}>
                  <Icon />
                  <span className="sr-only">{label} (coming soon)</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative border-t border-[color-mix(in_oklab,var(--ink)_18%,transparent)]">
        <p className="mx-auto max-w-[1280px] px-6 py-6 text-center text-[15px] md:px-10">
          © {new Date().getFullYear()} Azelle Fragrances. All rights reserved. Crafted with care in India.
        </p>
      </div>
    </footer>
  );
}
