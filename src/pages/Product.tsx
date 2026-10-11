import { Navigate, useParams } from "react-router-dom";
import { CatalogueStatus } from "@/components/product/CatalogueStatus";
import { useProducts } from "@/providers/ProductsProvider";
import ProductDetails from "./ProductDetails";
import NotFound from "./NotFound";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const { products, status, error, reload, getBySlug } = useProducts();
  const product = getBySlug(slug);
  if (slug === "imperium-2") return <Navigate to="/product/imperium" replace/>;
  if (!product) {
    if (status === "ready") return <NotFound />;
    return <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)]"><CatalogueStatus status={status} error={error} onRetry={reload} /></div>;
  }
  const others = products.filter(p => p.id !== product.id);
  const related = [...others.filter(p => p.group === product.group), ...others.filter(p => p.group !== product.group)].slice(0, 5);
  return <ProductDetails key={product.id} product={product} related={related} />;
}
