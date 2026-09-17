import { useEffect, useState, type ComponentType, type FormEvent, type ReactNode, type SVGProps } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fieldClass, labelClass } from "@/components/ui/Field";
import {
  AwardIcon,
  CheckCircleIcon,
  ClockIcon,
  DropletIcon,
  FlagIcon,
  GiftSmallIcon,
  MailIcon,
  PinIcon,
  RabbitIcon,
  TruckIcon,
  UserIcon,
  WhatsAppIcon,
} from "@/components/ui/Icons";
import { Ornament } from "@/components/ui/Ornament";
import { MAILTO_URL, WHATSAPP_URL } from "@/lib/contact";
import { COMPANY, INFO_PAGES, LAST_UPDATED, RELATED_PAGES, type IconKey, type InfoBlock, type InfoFormKind } from "@/content/infoPages";
import NotFound from "./NotFound";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<IconKey, IconType> = {
  truck: TruckIcon,
  clock: ClockIcon,
  check: CheckCircleIcon,
  gift: GiftSmallIcon,
  award: AwardIcon,
  flag: FlagIcon,
  rabbit: RabbitIcon,
  droplet: DropletIcon,
  mail: MailIcon,
};

const accentInk = { color: "color-mix(in oklab, var(--accent) 70%, var(--ink))" };

const iconRing = (Icon: IconType, size = 44) => (
  <span className="inline-flex shrink-0 rounded-full p-[2px] shadow-[0_6px_16px_rgba(27,24,21,.1)]" style={{ background: "var(--button-gradient)" }} aria-hidden="true">
    <span className="grid place-items-center rounded-full bg-surface" style={{ width: size, height: size, ...accentInk }}>
      <Icon width={size / 2} height={size / 2} />
    </span>
  </span>
);

function Block({ block }: { block: InfoBlock }) {
  if (typeof block === "string") return <p className="text-[15.5px] leading-[1.9]">{block}</p>;
  if ("list" in block) {
    return (
      <ul className="space-y-2.5">
        {block.list.map((item) => (
          <li key={item} className="flex gap-3 text-[15.5px] leading-[1.8]">
            <span className="mt-[0.72em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p
      className="rounded-[14px] border-l-[3px] bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] px-5 py-4 text-[15px] leading-[1.8]"
      style={{ borderColor: "var(--accent)" }}
    >
      {block.note}
    </p>
  );
}

function FormField({ id, label, full, children }: { id: string; label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

const GSTIN_PATTERN = "[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]";
const FORM_TITLES: Record<Exclude<InfoFormKind, "tracking">, { title: string; submit: string }> = {
  contact: { title: "Send us a message", submit: "Send message" },
  bulk: { title: "Tell us about your requirement", submit: "Send bulk enquiry" },
  gst: { title: "Request a GST invoice", submit: "Request GST invoice" },
};

// Contact, bulk order and GST invoice requests.
function RequestForm({ kind }: { kind: Exclude<InfoFormKind, "tracking"> }) {
  const [sentName, setSentName] = useState<string | null>(null);
  const { title, submit } = FORM_TITLES[kind];

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSentName(String(new FormData(e.currentTarget).get("name") ?? "").trim());
    e.currentTarget.reset();
  };

  return (
    <section aria-labelledby={`form-${kind}-h`} className="rounded-[24px] border border-line bg-surface p-6 shadow-[0_18px_40px_rgba(27,24,21,.06)] md:p-9">
      <h2 id={`form-${kind}-h`} className="font-display text-[1.9rem] leading-tight">
        {title}
      </h2>
      <div className="mt-3 w-[140px]">
        <Ornament align="left" wide />
      </div>
      <form onSubmit={onSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
        <FormField id={`${kind}-name`} label={kind === "gst" ? "Contact person" : "Full name"}>
          <input id={`${kind}-name`} name="name" required autoComplete="name" className={fieldClass} />
        </FormField>
        <FormField id={`${kind}-email`} label="Email">
          <input id={`${kind}-email`} name="email" type="email" required autoComplete="email" className={fieldClass} />
        </FormField>
        <FormField id={`${kind}-phone`} label="Mobile number">
          <input
            id={`${kind}-phone`}
            name="phone"
            type="tel"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            title="10-digit Indian mobile number"
            required={kind !== "contact"}
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            className={fieldClass}
          />
        </FormField>

        {kind === "contact" && (
          <>
            <FormField id="contact-topic" label="Topic">
              <select id="contact-topic" name="topic" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Choose a topic
                </option>
                <option>Order status</option>
                <option>Fragrance advice</option>
                <option>Returns & replacements</option>
                <option>GST invoice</option>
                <option>Bulk or corporate order</option>
                <option>Something else</option>
              </select>
            </FormField>
            <FormField id="contact-order" label="Order number (optional)">
              <input id="contact-order" name="order" placeholder="AZ-XXXXXX" className={fieldClass} />
            </FormField>
          </>
        )}

        {kind === "bulk" && (
          <>
            <FormField id="bulk-company" label="Company / organisation">
              <input id="bulk-company" name="company" autoComplete="organization" className={fieldClass} />
            </FormField>
            <FormField id="bulk-occasion" label="Occasion">
              <select id="bulk-occasion" name="occasion" required defaultValue="" className={fieldClass}>
                <option value="" disabled>
                  Choose an occasion
                </option>
                <option>Corporate gifting</option>
                <option>Wedding or celebration</option>
                <option>Event or brand activation</option>
                <option>Hotel, salon or hospitality</option>
                <option>Retail / resale</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField id="bulk-qty" label="Approximate quantity">
              <input id="bulk-qty" name="quantity" type="number" min={1} required className={fieldClass} />
            </FormField>
            <FormField id="bulk-city" label="Delivery city">
              <input id="bulk-city" name="city" required autoComplete="address-level2" className={fieldClass} />
            </FormField>
            <FormField id="bulk-date" label="Required by">
              <input id="bulk-date" name="date" type="date" className={fieldClass} />
            </FormField>
            <FormField id="bulk-gstin" label="GSTIN (optional)">
              <input id="bulk-gstin" name="gstin" pattern={GSTIN_PATTERN} title="15-character GSTIN" maxLength={15} className={`${fieldClass} uppercase`} />
            </FormField>
          </>
        )}

        {kind === "gst" && (
          <>
            <FormField id="gst-order" label="Order number">
              <input id="gst-order" name="order" required placeholder="AZ-XXXXXX" className={fieldClass} />
            </FormField>
            <FormField id="gst-gstin" label="GSTIN">
              <input id="gst-gstin" name="gstin" required pattern={GSTIN_PATTERN} title="15-character GSTIN" maxLength={15} className={`${fieldClass} uppercase`} />
            </FormField>
            <FormField id="gst-business" label="Registered business name" full>
              <input id="gst-business" name="business" required autoComplete="organization" className={fieldClass} />
            </FormField>
            <FormField id="gst-address" label="Registered business address" full>
              <textarea id="gst-address" name="address" required rows={3} className={`${fieldClass} h-auto py-3`} />
            </FormField>
          </>
        )}

        <FormField id={`${kind}-message`} label={kind === "gst" ? "Anything else? (optional)" : "Message"} full>
          <textarea
            id={`${kind}-message`}
            name="message"
            required={kind !== "gst"}
            rows={5}
            placeholder={kind === "bulk" ? "Fragrances, sizes, packaging or personalisation you have in mind" : undefined}
            className={`${fieldClass} h-auto py-3`}
          />
        </FormField>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button type="submit" className="btn btn-primary">
            {submit}
          </button>
          {sentName !== null && (
            <p role="status" className="text-sm">
              Thank you{sentName ? `, ${sentName}` : ""}. This form isn&apos;t connected to email yet, so the request was not sent.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function TrackingForm() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = orderId.trim().toUpperCase();
    if (id) navigate(`/order/${encodeURIComponent(id)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-[0_18px_40px_rgba(27,24,21,.06)] sm:flex-row sm:items-end md:p-9">
      <div className="flex-1">
        <label htmlFor="track-id" className={labelClass}>
          Order number
        </label>
        <input id="track-id" value={orderId} onChange={(e) => setOrderId(e.target.value)} required className={`${fieldClass} uppercase`} placeholder="AZ-XXXXXX" />
      </div>
      <button type="submit" className="btn btn-primary">
        Track order
      </button>
    </form>
  );
}

function ContactCards() {
  // The first line links out where it can be acted on (mail app / WhatsApp).
  const cards: { Icon: IconType; title: string; lines: string[]; href?: string; external?: boolean }[] = [
    { Icon: MailIcon, title: "Email", lines: [COMPANY.email, "Replies within one business day"], href: MAILTO_URL },
    { Icon: WhatsAppIcon, title: "Phone & WhatsApp", lines: [COMPANY.phone, COMPANY.hours], href: WHATSAPP_URL, external: true },
    { Icon: PinIcon, title: "Registered office", lines: [COMPANY.legalName, COMPANY.address] },
    { Icon: UserIcon, title: "Grievance Officer", lines: [COMPANY.grievanceOfficer, COMPANY.grievanceEmail] },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ Icon, title, lines, href, external }) => (
        <li key={title} className="rounded-[20px] border border-line bg-surface p-6">
          {iconRing(Icon)}
          <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.16em]">{title}</p>
          {lines.map((line, i) => (
            <p key={line} className={`break-words text-[15px] leading-relaxed ${i === 0 ? "mt-2 font-semibold" : "mt-1"}`}>
              {i === 0 && href ? (
                <a href={href} className="text-link" {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
                  {line}
                </a>
              ) : (
                line
              )}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

// Information and Our House pages linked from the header menu and footer.
export default function InfoPage() {
  const { slug = "" } = useParams();
  const page = INFO_PAGES[slug];

  useEffect(() => {
    if (page) document.title = `${page.title} — Azelle Fragrances`;
  }, [page]);

  if (!page) return <NotFound />;

  const withToc = page.legal && page.sections.length >= 4;
  const form = page.form === "tracking" ? <TrackingForm /> : page.form ? <RequestForm kind={page.form} /> : null;
  const related = RELATED_PAGES.filter((p) => p.slug !== slug);

  const sections = (
    <div className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
      {page.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-[calc(var(--header-h)+1.5rem)] p-6 md:p-9">
          <h2 id={`${s.id}-h`} className="font-display text-[1.6rem] leading-tight">
            {s.heading}
          </h2>
          <div className="mt-4 space-y-4">
            {s.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="hero__bg opacity-60" aria-hidden="true" />
      {/* Extra bottom padding: the gradient continues into the space where the footer bottles stand. */}
      <div className="relative mx-auto max-w-[1200px] px-6 pb-40 pt-[calc(var(--header-h)+3rem)] md:px-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.16em]">
          <Link to="/" className="text-link">
            Home
          </Link>{" "}
          / <span>{page.eyebrow}</span> / <span className="font-semibold">{page.title}</span>
        </nav>

        <header className="mt-10 max-w-[780px]">
          <p className="section-sub">{page.eyebrow}</p>
          <Ornament align="left" className="my-3" />
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.05]">{page.title}</h1>
          <p className="mt-5 text-lg leading-relaxed">{page.intro}</p>
          {page.legal && <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em]">Last updated: {LAST_UPDATED}</p>}
        </header>

        {page.highlights && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {page.highlights.map(({ icon, title, text }) => (
              <li key={title} className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5">
                {iconRing(ICONS[icon])}
                <span>
                  <span className="block text-[12px] font-bold uppercase tracking-[0.14em]">{title}</span>
                  <span className="mt-1 block text-[14.5px] leading-snug">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {page.showContact && (
          <div className="mt-10">
            <ContactCards />
          </div>
        )}

        {page.formFirst && form && <div className="mt-10">{form}</div>}

        {withToc ? (
          <div className="mt-12 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-h)+1.5rem)] rounded-[20px] border border-line bg-surface p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]">On this page</p>
                <ol className="mt-4 space-y-2.5">
                  {page.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-link text-[14px] leading-snug">
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
            {sections}
          </div>
        ) : (
          <div className="mt-12">{sections}</div>
        )}

        {!page.formFirst && form && <div className="mt-10">{form}</div>}

        <nav aria-label="Related pages" className="mt-14">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em]">Related pages</p>
          <div className="mt-3 w-[140px]">
            <Ornament align="left" wide />
          </div>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {related.map((p) => (
              <li key={p.slug}>
                <Link to={`/pages/${p.slug}`} className="chip inline-flex items-center">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
