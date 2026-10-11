import { useEffect, useState } from "react";
import { api } from "@/lib/api";
type Request = {
  _id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  details: Record<string, string>;
  createdAt: string;
};
export default function AdminSupport() {
  const [requests, setRequests] = useState<Request[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ requests: Request[] }>("/api/admin/support")
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }, []);
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Support requests</h1>
      <p className="my-4">
        Contact, bulk and GST invoice enquiries received through the storefront.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="grid gap-4">
        {requests.map((request) => (
          <article key={request._id} className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">
              {request.kind.toUpperCase()} · {request.name}
            </h2>
            <p>
              {request.email} · {request.phone} ·{" "}
              {new Date(request.createdAt).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap my-3">{request.message}</p>
            <dl>
              {Object.entries(request.details)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="inline font-semibold">{key}: </dt>
                    <dd className="inline">{value}</dd>
                  </div>
                ))}
            </dl>
            <p className="text-xs mt-3">Reference: {request._id}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
