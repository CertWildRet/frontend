import { BACKEND_BASE_URL } from "@/lib/api";

/** Shown when NEXT_PUBLIC_BACKEND_URL is unset — clarifies that all data is mocked. */
export function BackendBanner() {
  if (BACKEND_BASE_URL) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      <span className="font-semibold">Backend URL not configured.</span>{" "}
      Showing mock data. Set{" "}
      <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
        NEXT_PUBLIC_BACKEND_URL
      </code>{" "}
      in <code className="rounded bg-black/30 px-1 py-0.5 text-xs">.env.local</code>{" "}
      to wire the brain.
    </div>
  );
}
