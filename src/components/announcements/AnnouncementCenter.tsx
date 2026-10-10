import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Drawer } from "@/components/ui/Drawer";
import { CloseIcon } from "@/components/ui/Icons";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { sized } from "@/lib/images";
import type { Announcement } from "@/lib/announcements";
import { useAnnouncements } from "@/providers/AnnouncementProvider";

// How a launch or an offer reaches the shopper:
//   1. the first time they land on the site, one popup;
//   2. after that, a slim "What's new" ribbon on the right edge — it stays out of the way,
//      keeps a pulse while something is unread, and slides open on a tap.

function CtaLink({ item, className, children, onClick }: { item: Announcement; className: string; children: ReactNode; onClick: () => void }) {
  if (!item.ctaHref) return null;
  return item.ctaHref.startsWith("/") ? (
    <Link to={item.ctaHref} className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <a href={item.ctaHref} target="_blank" rel="noreferrer noopener" className={className} onClick={onClick}>
      {children}
    </a>
  );
}

const toneClass = (tone: Announcement["tone"]) =>
  tone === "dark" ? "announce-card announce-card--dark" : tone === "light" ? "announce-card announce-card--light" : "announce-card announce-card--gradient";

function Popup() {
  const { popup, dismissPopup, minimisePopup, noteClick, openPanel } = useAnnouncements();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = Boolean(popup);
  useFocusTrap(open, minimisePopup, panelRef);

  if (!popup) return null;

  return (
    <div className="announce-popup fixed inset-0 z-[80] grid place-items-center p-5">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="Close announcement" onClick={minimisePopup} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announce-title"
        tabIndex={-1}
        className={`${toneClass(popup.tone)} announce-popup__card relative w-full min-w-0 max-w-[520px] overflow-hidden rounded-[24px] outline-none`}
      >
        <button type="button" className="announce-close" onClick={minimisePopup} aria-label="Close">
          <CloseIcon width={18} height={18} />
        </button>

        {popup.image && (
          <div className="overflow-hidden">
            <img src={sized(popup.image, 720)} alt="" className="h-[190px] w-full object-cover md:h-[230px]" />
          </div>
        )}

        <div className="px-7 pb-7 pt-8 md:px-9 md:pb-8 md:pt-9">
          {popup.eyebrow && <p className="text-[10.5px] font-semibold uppercase tracking-[0.3em] opacity-70">{popup.eyebrow}</p>}
          <h2 id="announce-title" className="mt-2.5 font-display text-[clamp(1.6rem,3.6vw,2.15rem)] leading-[1.12]">
            {popup.title}
          </h2>
          <span className="announce-rule" aria-hidden="true" />
          <p className="max-w-[420px] text-[15px] leading-relaxed opacity-90">{popup.message}</p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink
              item={popup}
              className="btn btn-primary !min-w-0"
              onClick={() => {
                noteClick(popup.id);
                dismissPopup();
              }}
            >
              {popup.ctaLabel || "Discover"}
            </CtaLink>
            <button type="button" className="link-underline text-[11.5px] font-semibold uppercase tracking-[0.16em]" onClick={dismissPopup}>
              No thanks
            </button>
          </div>
        </div>

        {/* Quiet footer: the rest of the news, without competing with the button above. */}
        <button
          type="button"
          className="announce-more"
          onClick={() => {
            minimisePopup();
            openPanel();
          }}
        >
          See everything that&rsquo;s new <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

function Card({ item, onCta }: { item: Announcement; onCta: () => void }) {
  return (
    <li className={`${toneClass(item.tone)} rounded-[18px] p-5`}>
      {item.eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.26em]">{item.eyebrow}</p>}
      <h3 className="mt-2 font-display text-xl leading-tight">{item.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed">{item.message}</p>
      {item.ctaHref && (
        <CtaLink item={item} className="link-underline mt-4 text-[12px] font-semibold uppercase tracking-[0.16em]" onClick={onCta}>
          {item.ctaLabel || "Discover"} →
        </CtaLink>
      )}
    </li>
  );
}

function Ribbon() {
  const { items, isPanelOpen, openPanel, closePanel, noteClick, popup } = useAnnouncements();
  if (items.length === 0) return null;

  return (
    <>
      {/* The tab itself: vertical, on the right edge, out of the way of the content. */}
      {!popup && !isPanelOpen && (
        <button type="button" className="announce-ribbon" onClick={openPanel} aria-haspopup="dialog">
          <span className="announce-ribbon__dot" aria-hidden="true" />
          <span className="announce-ribbon__label">What&rsquo;s new</span>
          <span className="sr-only">
            {items.length} {items.length === 1 ? "announcement" : "announcements"}
          </span>
        </button>
      )}

      <Drawer open={isPanelOpen} onClose={closePanel} side="right" label="What's new" panelClassName="w-full max-w-sm">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Azelle</p>
              <p className="font-display text-2xl leading-none">What&rsquo;s new</p>
            </div>
            <button type="button" className="icon-btn" onClick={closePanel} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
          <ul className="flex-1 space-y-4 overflow-y-auto p-6">
            {items.map((item) => (
              <Card key={item.id} item={item} onCta={() => noteClick(item.id)} />
            ))}
          </ul>
        </div>
      </Drawer>
    </>
  );
}

export function AnnouncementCenter() {
  return (
    <>
      <Popup />
      <Ribbon />
    </>
  );
}
