import { Link } from "react-router-dom";
import { Ornament } from "@/components/ui/Ornament";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function NotFound() {
  return (
    <div className="relative grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)] text-center">
      <div className="w-full">
        <div className="page-heading-row page-heading-row--center"><p className="section-sub">Page not found</p><Breadcrumb title="Page not found" /></div>
        <Ornament className="my-3" />
        <h1 className="font-display text-5xl">This note has faded.</h1>
        <Link to="/" className="btn btn-primary mt-8">
          Back to home
        </Link>
      </div>
    </div>
  );
}
