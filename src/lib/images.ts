import { OPTIMIZED_IMAGES } from "./imageVariants";

const isUnsplash = (src: string) => src.startsWith("https://images.unsplash.com/");

export function sized(src: string, width: number) {
  if (OPTIMIZED_IMAGES.has(src)) {
    const size = width <= 200 ? 200 : width <= 600 ? 560 : 1200;
    return src.replace(/\.webp$/, `-${size}.webp`).replace("/uploads/", "/uploads/optimized/");
  }
  if (!isUnsplash(src)) return src;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}

export function srcSet(src: string, widths: number[] = [400, 800, 1200, 1600]) {
  if (OPTIMIZED_IMAGES.has(src)) return [200, 560, 1200].map((w) => `${sized(src, w)} ${w}w`).join(", ");
  return isUnsplash(src) ? widths.map((w) => `${sized(src, w)} ${w}w`).join(", ") : undefined;
}
