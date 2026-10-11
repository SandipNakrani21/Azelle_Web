import { ConsentNotice } from "./ConsentNotice";
import { Link } from "react-router-dom";
import { CameraIcon, MailIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { CONTACT, MAILTO_URL, WHATSAPP_URL } from "@/lib/contact";
import { linkState, NAV_SECTIONS } from "@/lib/navigation";
import { Ornament } from "@/components/ui/Ornament";
import { useAuth } from "@/providers/AuthProvider";

// Same sections as the header menu (src/lib/navigation.ts).
const COLUMNS = NAV_SECTIONS;

const SOCIAL = [
  { label: "Instagram", Icon: CameraIcon, href: CONTACT.instagram, external: true },
  { label: "WhatsApp", Icon: WhatsAppIcon, href: WHATSAPP_URL, external: true },
  { label: "Email", Icon: MailIcon, href: MAILTO_URL, external: false },
];

// Column heading followed by the same line — ✦ — line rule used under section titles.
function ColumnHeading({ children }: { children: string }) {
  return (
    <div className="footer-heading w-fit max-w-full">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]">{children}</h3>
      <Ornament align="left" wide className="footer-heading-divider mt-3" />
    </div>
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
          <linearGradient id="azelle-product-action-gradient" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
            <stop offset="0" stopColor="#ded0ef" />
            <stop offset="0.5" stopColor="#ffe0d0" />
            <stop offset="1" stopColor="#c7ece2" />
          </linearGradient>
          <linearGradient id="azelle-icon-gradient" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
            <stop offset="0" stopColor="#e6b45a" />
            <stop offset="0.35" stopColor="#e9a58f" />
            <stop offset="0.7" stopColor="#cf8f9c" />
            <stop offset="1" stopColor="#9fc2ad" />
          </linearGradient>
        </defs>
      </svg>

      {/* Full width: the logo column sits at the left edge, "Others" at the right edge, the rest spaced evenly. */}
      <div className="relative grid gap-x-10 gap-y-12 px-6 pb-14 pt-24 sm:grid-cols-2 md:px-12 lg:flex lg:justify-between lg:gap-x-12 xl:px-16">
        {/* 1. Logo, tagline, description — full width while the navs are in two columns. */}
        <div className="w-full max-w-[280px] sm:col-span-2 lg:col-span-1 lg:shrink-0">
          <div className="flex justify-center">
            <Logo className="-translate-x-3" imgClassName="h-24" />
          </div>
          <p className="mt-6 w-full text-left font-display text-[24px] font-bold leading-snug tracking-[-0.025em]">Fragrance Beyond Words</p>
          <p className="mt-5 w-full text-[15.5px] leading-[2]">Niche perfume extracts, composed slowly in small batches.</p>

        </div>

        {/* 2–4. Shop, Information, Our house */}
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <ColumnHeading>{col.heading}</ColumnHeading>
            <ul className="mt-5 space-y-3.5 font-display text-xl">
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

        {/* 5. Others: account and help */}
        <nav aria-label="Others">
          <ColumnHeading>Others</ColumnHeading>
          <ul className="mt-5 space-y-3.5 font-display text-xl">
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
            <ColumnHeading>Follow us on</ColumnHeading>
          </div>
          <ul className="mt-5 flex gap-3">
            {SOCIAL.map(({ label, Icon, href, external }) => (
              <li key={label}>
                <a
                  href={href}
                  className="social"
                  title={label}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  <Icon />
                  <span className="sr-only">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <ConsentNotice />
      <div className="relative">
        <p className="mx-auto max-w-[1280px] px-6 py-6 text-center text-[15px] md:px-10">
          © {new Date().getFullYear()} Azelle Fragrances. All rights reserved. Crafted with care in India.
        </p>
      </div>
    </footer>
  );
}
