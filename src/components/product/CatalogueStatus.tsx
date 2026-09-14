type CatalogueStatusProps = {
  status: "loading" | "ready" | "error";
  error?: string;
  onRetry?: () => void;
};

// Loading / error message for anything that depends on the product API.
export function CatalogueStatus({ status, error, onRetry }: CatalogueStatusProps) {
  if (status === "ready") return null;

  if (status === "loading") {
    return (
      <p role="status" className="mt-10 text-center text-sm">
        Loading the collection…
      </p>
    );
  }

  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-[16px] border border-line bg-surface px-6 py-6 text-center">
      <p className="font-display text-2xl">The collection couldn&apos;t load</p>
      {error && <p className="mt-2 text-sm">{error}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
