import { OPTIMIZED_IMAGES } from "./imageVariants";

const isUnsplash = (src: string) => src.startsWith("https://images.unsplash.com/");

export function sized(src: string, width: number) {
  if (/^\/images\/products\/(imperium|conqueror|white-oud|urban-voyage|desire-edge)-matched-bottle\.webp$/.test(src)) return src.replace(/\.webp$/,`-${width<=200?200:width<=600?560:900}.webp`);
  if (OPTIMIZED_IMAGES.has(src)) {
    const size = width <= 200 ? 200 : width <= 600 ? 560 : 1200;
    return src.replace(/\.webp$/, `-${size}.webp`).replace("/uploads/", "/uploads/optimized/");
  }
  if (!isUnsplash(src)) return src;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}

export function srcSet(src: string, widths: number[] = [400, 800, 1200, 1600]) {
  if (/^\/images\/products\/(imperium|conqueror|white-oud|urban-voyage|desire-edge)-matched-bottle\.webp$/.test(src)) return [200,560,900].map(w=>`${sized(src,w)} ${w}w`).join(", ");
  if (OPTIMIZED_IMAGES.has(src)) return [200, 560, 1200].map((w) => `${sized(src, w)} ${w}w`).join(", ");
  return isUnsplash(src) ? widths.map((w) => `${sized(src, w)} ${w}w`).join(", ") : undefined;
}
