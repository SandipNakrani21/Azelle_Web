import { Link } from "react-router-dom";
import { Ornament } from "@/components/ui/Ornament";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-[var(--header-h)] text-center">
      <div>
        <p className="section-sub">Page not found</p>
        <Ornament className="my-3" />
        <h1 className="font-display text-5xl">This note has faded.</h1>
        <Link to="/" className="btn btn-primary mt-8">
          Back to home
        </Link>
      </div>
    </div>
  );
}
