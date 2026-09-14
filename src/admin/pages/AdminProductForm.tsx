import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { fieldClass, labelClass } from "@/components/ui/Field";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { StockBadge } from "@/components/ui/StockBadge";
import { ApiError } from "@/lib/api";
import { sized } from "@/lib/images";
import { FAMILIES, MAX_PRODUCT_IMAGES, SIZES, formatPrice, type FragranceFamily, type Size } from "@/lib/products";
import { useAdminAuth } from "../AdminAuthProvider";
import { adminApi, type AdminProduct, type ProductInput, type ProductStatus } from "../adminApi";

type FormState = {
  name: string;
  slug: string;
  family: string;
  tagline: string;
  description: string;
  concentration: string;
  perfumeOil: string;
  longevity: string;
  prices: Record<Size["id"], string>;
  inStock: boolean;
  status: ProductStatus;
  families: FragranceFamily[];
  group: FragranceFamily | "";
  notes: string;
  top: string;
  heart: string;
  base: string;
  highlights: string;
  images: string[];
  tint: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  family: "",
  tagline: "",
  description: "",
  concentration: "Perfume",
  perfumeOil: "",
  longevity: "",
  prices: { "30": "", "50": "", "100": "" },
  inStock: true,
  status: "active",
  families: [],
  group: "",
  notes: "",
  top: "",
  heart: "",
  base: "",
  highlights: "",
  images: [],
  tint: "#c9a27e",
};

const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DESCRIPTION_MAX = 1200;
const MAX_HIGHLIGHTS = 8;

const toForm = (p: AdminProduct): FormState => ({
  name: p.name,
  slug: p.slug,
  family: p.family,
  tagline: p.tagline ?? "",
  description: p.description,
  concentration: p.concentration || "Perfume",
  perfumeOil: p.perfumeOil == null ? "" : String(p.perfumeOil),
  longevity: p.longevity ?? "",
  prices: { "30": String(p.prices["30"]), "50": String(p.prices["50"]), "100": String(p.prices["100"]) },
  inStock: p.inStock,
  status: p.status,
  families: p.families,
  group: p.group,
  notes: p.notes,
  top: p.pyramid.top,
  heart: p.pyramid.heart,
  base: p.pyramid.base,
  highlights: (p.highlights ?? []).join("\n"),
  images: p.images.slice(0, MAX_PRODUCT_IMAGES),
  tint: p.tint,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401;

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { guard } = useAdminAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(isEdit ? "loading" : "ready");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${isEdit ? "Edit" : "Add"} product — Azelle admin`;
  }, [isEdit]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    guard(adminApi.getProduct(id)).then(
      ({ product }) => {
        if (cancelled) return;
        setForm(toForm(product));
        setSlugEdited(true);
        setLoadState("ready");
      },
      (err: unknown) => {
        if (cancelled || isUnauthorized(err)) return;
        setFormError(err instanceof Error ? err.message : "Could not load this product.");
        setLoadState("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, guard]);

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const updatePrice = (sizeId: Size["id"], value: string) => {
    setForm((prev) => ({ ...prev, prices: { ...prev.prices, [sizeId]: value } }));
    clearError(`price${sizeId}`);
  };

  const onNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value, slug: slugEdited ? prev.slug : slugify(value) }));
    clearError("name");
    if (!slugEdited) clearError("slug");
  };

  const toggleFamily = (family: FragranceFamily) => {
    setForm((prev) => {
      const families = prev.families.includes(family) ? prev.families.filter((f) => f !== family) : [...prev.families, family];
      const group = prev.group && families.includes(prev.group) ? prev.group : (families[0] ?? "");
      return { ...prev, families, group };
    });
    clearError("families");
  };

  const addImage = (url: string) => {
    setForm((prev) => (prev.images.length >= MAX_PRODUCT_IMAGES ? prev : { ...prev, images: [...prev.images, url] }));
    clearError("images");
  };

  const moveImage = (index: number, step: -1 | 1) =>
    setForm((prev) => {
      const target = index + step;
      if (target < 0 || target >= prev.images.length) return prev;
      const images = [...prev.images];
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, images };
    });

  const removeImage = (index: number) => setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!UPLOAD_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, images: "Upload a JPG, PNG, WebP or AVIF image." }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrors((prev) => ({ ...prev, images: "Images must be 5 MB or smaller." }));
      return;
    }
    setUploading(true);
    try {
      const { url } = await guard(adminApi.uploadImage(file));
      addImage(url);
    } catch (err) {
      if (!isUnauthorized(err)) setErrors((prev) => ({ ...prev, images: err instanceof Error ? err.message : "Upload failed." }));
    } finally {
      setUploading(false);
    }
  };

  const onAddUrl = () => {
    const url = imageUrl.trim();
    if (!/^https:\/\/\S+$/i.test(url)) {
      setErrors((prev) => ({ ...prev, images: "Paste an image link that starts with https://" }));
      return;
    }
    addImage(url);
    setImageUrl("");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setErrors({});

    const input: ProductInput = {
      name: form.name,
      slug: form.slug,
      family: form.family,
      group: form.group,
      families: form.families,
      prices: { "30": Number(form.prices["30"]), "50": Number(form.prices["50"]), "100": Number(form.prices["100"]) },
      notes: form.notes,
      pyramid: { top: form.top, heart: form.heart, base: form.base },
      description: form.description,
      tagline: form.tagline,
      concentration: form.concentration,
      perfumeOil: form.perfumeOil.trim() === "" ? null : Number(form.perfumeOil),
      longevity: form.longevity,
      highlights: form.highlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean),
      images: form.images,
      tint: form.tint,
      inStock: form.inStock,
      status: form.status,
    };

    try {
      if (id) await guard(adminApi.updateProduct(id, input));
      else await guard(adminApi.createProduct(input));
      navigate("/admin/products", { state: { flash: `“${form.name.trim()}” was ${id ? "updated" : "added"}.` } });
    } catch (err) {
      if (isUnauthorized(err)) return;
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSaving(false);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loadState === "loading") {
    return (
      <p role="status" className="py-20 text-center">
        Loading product…
      </p>
    );
  }

  if (loadState === "error") {
    return (
      <div role="alert" className="py-20 text-center">
        <p className="font-display text-3xl">Couldn&apos;t load this product</p>
        <p className="mt-2 text-sm">{formError}</p>
        <Link to="/admin/products" className="btn btn-secondary mt-6">
          Back to products
        </Link>
      </div>
    );
  }

  const previewPrice = Number(form.prices["50"]);
  const highlightCount = form.highlights.split("\n").filter((h) => h.trim()).length;

  return (
    <div ref={topRef} className="scroll-mt-32">
      <Link to="/admin/products" className="text-link text-sm">
        ← All products
      </Link>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em]">{isEdit ? "Edit product" : "New product"}</p>
      <h1 className="mt-1 font-display text-[2.75rem] leading-none">{isEdit ? form.name || "Edit product" : "Add product"}</h1>

      {formError && (
        <p role="alert" className="mt-6 rounded-[12px] bg-[#b3261e] px-4 py-3 text-sm text-white">
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Section title="Basic details" description="What customers see first on the product page.">
            <TextField id="name" label="Product name" value={form.name} onValueChange={onNameChange} error={errors.name} maxLength={80} />
            <TextField
              id="slug"
              label="URL slug"
              value={form.slug}
              onValueChange={(v) => {
                setSlugEdited(true);
                update("slug", v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              error={errors.slug}
              hint={`Page address: /product/${form.slug || "…"}`}
              maxLength={90}
            />
            <TextField id="family" label="Family description" value={form.family} onValueChange={(v) => update("family", v)} error={errors.family} hint="Shown above the name, e.g. Woody Oud." maxLength={60} />
            <TextField id="tagline" label="Tagline" required={false} value={form.tagline} onValueChange={(v) => update("tagline", v)} error={errors.tagline} hint="e.g. The art of distinction." maxLength={80} />
            <div className="sm:col-span-2">
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={DESCRIPTION_MAX}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : undefined}
                className={`${fieldClass} !h-auto py-3 leading-relaxed ${errors.description ? "!border-[#b3261e]" : ""}`}
              />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <FieldError id="description-error" message={errors.description} />
                <span className="ml-auto text-xs tabular-nums">
                  {form.description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Formula" description="Shown as quick facts on the product page.">
            <TextField
              id="concentration"
              label="Concentration"
              value={form.concentration}
              onValueChange={(v) => update("concentration", v)}
              error={errors.concentration}
              hint="e.g. Perfume extract, Perfume."
              list="concentration-options"
              maxLength={40}
            />
            <datalist id="concentration-options">
              <option value="Perfume extract" />
              <option value="Perfume" />
            </datalist>
            <TextField
              id="perfumeOil"
              label="Perfume oil (%)"
              required={false}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              value={form.perfumeOil}
              onValueChange={(v) => update("perfumeOil", v)}
              error={errors.perfumeOil}
            />
            <TextField id="longevity" label="Longevity" required={false} value={form.longevity} onValueChange={(v) => update("longevity", v)} error={errors.longevity} hint="e.g. 8–12 hours." maxLength={40} />
          </Section>

          <Section title="Prices & availability" description="Price for each bottle size, in rupees.">
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              {SIZES.map((size) => (
                <TextField
                  key={size.id}
                  id={`price${size.id}`}
                  label={`${size.label} price (₹)`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={form.prices[size.id]}
                  onValueChange={(v) => updatePrice(size.id, v)}
                  error={errors[`price${size.id}`]}
                />
              ))}
            </div>
            <Segmented
              name="inStock"
              legend="Stock"
              value={form.inStock ? "in" : "out"}
              options={[
                { value: "in", label: "In stock" },
                { value: "out", label: "Sold out" },
              ]}
              onChange={(v) => update("inStock", v === "in")}
            />
            <Segmented
              name="status"
              legend="Status"
              value={form.status}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              onChange={(v) => update("status", v)}
              hint="Only active products appear on the store."
            />
          </Section>

          <Section title="Fragrance families" description="Used for the family filters and suggestions.">
            <fieldset className="sm:col-span-2" aria-describedby={errors.families ? "families-error" : undefined}>
              <legend className={labelClass}>Families</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FAMILIES.map((family) => {
                  const checked = form.families.includes(family);
                  return (
                    <label key={family} className="cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleFamily(family)} className="peer sr-only" />
                      <span className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-medium transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2">
                        {checked ? "✓ " : ""}
                        {family}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError id="families-error" message={errors.families} />
            </fieldset>
            <div className="sm:col-span-2 sm:max-w-xs">
              <label htmlFor="group" className={labelClass}>
                Primary family
              </label>
              <select
                id="group"
                value={form.group}
                onChange={(e) => update("group", e.target.value as FragranceFamily)}
                disabled={!form.families.length}
                className={fieldClass}
              >
                {form.families.length ? form.families.map((f) => <option key={f}>{f}</option>) : <option value="">Choose families first</option>}
              </select>
            </div>
          </Section>

          <Section title="Fragrance notes" description="Separate notes with commas.">
            <TextField id="notes" label="Key notes" value={form.notes} onValueChange={(v) => update("notes", v)} error={errors.notes} hint="Shown under the description, e.g. Saffron · Oud · Sandalwood." wide maxLength={200} />
            <TextField id="top" label="Top notes" value={form.top} onValueChange={(v) => update("top", v)} error={errors.top} hint="The opening — first 15 minutes." wide maxLength={200} />
            <TextField id="heart" label="Heart notes" value={form.heart} onValueChange={(v) => update("heart", v)} error={errors.heart} hint="The heart — 30 minutes to 3 hours." wide maxLength={200} />
            <TextField id="base" label="Base notes" value={form.base} onValueChange={(v) => update("base", v)} error={errors.base} hint="The dry-down — 3 hours and beyond." wide maxLength={200} />
            <div className="sm:col-span-2">
              <label htmlFor="highlights" className={labelClass}>
                Highlights <span className="ml-1 font-normal normal-case tracking-normal">(optional, one per line)</span>
              </label>
              <textarea
                id="highlights"
                rows={4}
                value={form.highlights}
                onChange={(e) => update("highlights", e.target.value)}
                placeholder={"31% perfume oil\nLasts up to 12 hours\nCruelty free"}
                aria-invalid={Boolean(errors.highlights)}
                aria-describedby={errors.highlights ? "highlights-error" : "highlights-hint"}
                className={`${fieldClass} !h-auto py-3 leading-relaxed placeholder:text-soft ${errors.highlights ? "!border-[#b3261e]" : ""}`}
              />
              <p id="highlights-hint" className={`mt-1.5 text-xs ${highlightCount > MAX_HIGHLIGHTS ? "font-semibold text-[#b3261e]" : ""}`}>
                {highlightCount}/{MAX_HIGHLIGHTS} highlights — shown as a checklist on the product page.
              </p>
              <FieldError id="highlights-error" message={errors.highlights} />
            </div>
          </Section>

          <section className="rounded-[18px] border border-line bg-surface p-6 md:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">Images</h2>
              <p className="text-sm tabular-nums">
                {form.images.length} / {MAX_PRODUCT_IMAGES}
              </p>
            </div>
            <p className="mt-1 text-sm">The first image is the main photo. Upload JPG, PNG, WebP or AVIF (up to 5 MB), or paste an https:// link.</p>

            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.images.map((src, i) => (
                <li key={`${src}-${i}`} className="overflow-hidden rounded-[14px] border border-line bg-surface2">
                  <div className="relative aspect-square">
                    <img src={sized(src, 400)} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-bg">
                      {i === 0 ? "Main" : i + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-1.5">
                    <div className="flex">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} earlier`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface disabled:opacity-30">
                        <ChevronLeftIcon width={16} height={16} />
                      </button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label={`Move image ${i + 1} later`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface disabled:opacity-30">
                        <ChevronRightIcon width={16} height={16} />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeImage(i)} aria-label={`Remove image ${i + 1}`} className="px-2 text-xs font-semibold text-[#b3261e] hover:underline">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
              {form.images.length < MAX_PRODUCT_IMAGES && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="grid aspect-square w-full place-items-center rounded-[14px] border-2 border-dashed border-line text-sm font-semibold transition-colors duration-300 hover:border-ink disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "+ Upload image"}
                  </button>
                </li>
              )}
            </ul>
            <input ref={fileInput} type="file" accept={UPLOAD_TYPES.join(",")} onChange={onUpload} className="sr-only" tabIndex={-1} aria-hidden="true" />

            {form.images.length < MAX_PRODUCT_IMAGES && (
              <div className="mt-4 flex flex-wrap gap-2">
                <label htmlFor="image-url" className="sr-only">
                  Image link
                </label>
                <input
                  id="image-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddUrl();
                    }
                  }}
                  className={`${fieldClass} !mt-0 min-w-0 flex-1`}
                />
                <button type="button" onClick={onAddUrl} className="btn btn-secondary !h-12 !min-w-0 !px-5">
                  Add link
                </button>
              </div>
            )}
            <FieldError id="images-error" message={errors.images} />
          </section>

          <Section title="Bottle colour" description="Used for the illustrated bottle on cards, in the cart and when a product has no photo.">
            <div className="flex items-end gap-3">
              <div>
                <label htmlFor="tint" className={labelClass}>
                  Colour
                </label>
                <input id="tint" type="color" value={form.tint} onChange={(e) => update("tint", e.target.value)} className="mt-2 h-12 w-16 cursor-pointer rounded-[10px] border border-line bg-surface p-1" />
              </div>
              <p className="pb-3 text-sm tabular-nums">{form.tint}</p>
            </div>
          </Section>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-[18px] border border-line bg-surface px-5 py-4 shadow-[0_-8px_24px_rgba(27,24,21,.06)]">
            <Link to="/admin/products" className="btn btn-secondary !min-w-0">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28" aria-label="Live preview">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden">
              <div className="hero__bg" aria-hidden="true" />
              {form.images[0] ? (
                <img src={sized(form.images[0], 600)} alt="" className="relative h-full w-full object-cover" />
              ) : (
                <Bottle tint={form.tint} name={form.name || "Product name"} decorative className="relative h-[80%] w-auto" />
              )}
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StockBadge inStock={form.inStock} />
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${form.status === "active" ? "bg-surface2" : "bg-ink text-bg"}`}>
                  {form.status === "active" ? "Visible on store" : "Hidden"}
                </span>
              </div>
              <p className="text-gradient mt-4 pb-[0.08em] font-display text-3xl leading-tight">{form.name || "Product name"}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                {form.family || "Family"} · {form.concentration || "Perfume"}
              </p>
              {form.tagline && <p className="mt-2 font-display text-lg">{form.tagline}</p>}
              <p className="mt-4 text-2xl font-bold tabular-nums">{previewPrice > 0 ? formatPrice(Math.round(previewPrice)) : "₹—"}</p>
              <p className="text-xs">50 ml</p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{form.description || "Description will appear here."}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs">Live preview</p>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-line bg-surface p-6 md:p-7">
      <h2 className="font-display text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-[#b3261e]">
      {message}
    </p>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id"> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: string;
  wide?: boolean;
};

function TextField({ id, label, value, onValueChange, error, hint, wide, required = true, ...input }: TextFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {!required && <span className="ml-1 font-normal normal-case tracking-normal">(optional)</span>}
      </label>
      <input
        {...input}
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${fieldClass} ${error ? "!border-[#b3261e]" : ""}`}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

type SegmentedProps<T extends string> = {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
};

function Segmented<T extends string>({ name, legend, value, options, onChange, hint }: SegmentedProps<T>) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
            <span className="flex h-12 items-center justify-center rounded-[10px] border border-line bg-surface text-sm font-semibold transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs">{hint}</p>}
    </fieldset>
  );
}
