// Image URL helpers. Uploaded photos (/uploads/…) and other links are used as-is;
// Unsplash placeholders get width-sized variants.

const isUnsplash = (src: string) => src.startsWith("https://images.unsplash.com/");

export function sized(src: string, width: number) {
  if (!isUnsplash(src)) return src;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}

export function srcSet(src: string, widths: number[] = [400, 800, 1200, 1600]) {
  return isUnsplash(src) ? widths.map((w) => `${sized(src, w)} ${w}w`).join(", ") : undefined;
}
