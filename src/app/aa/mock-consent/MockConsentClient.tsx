"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MockConsentClient() {
  const params = useSearchParams();
  const router = useRouter();
  const consentId = params.get("consentId") ?? "";
  const redirect = params.get("redirect") ?? "/aa-test";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnUrl = useMemo(() => {
    const url = new URL(redirect, window.location.origin);
    url.searchParams.set("consentId", consentId);
    return url;
  }, [consentId, redirect]);

  async function complete(outcome: "ACTIVE" | "REJECTED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/aa/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId, outcome }),
      });
      const data = (await res.json()) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? "Unable to complete mock consent.");
      }
      if (outcome === "ACTIVE") {
        returnUrl.searchParams.set("aa", "connected");
      } else {
        returnUrl.searchParams.set("aa_error", "consent_rejected");
        returnUrl.searchParams.set(
          "aa_message",
          "Consent was cancelled by the user.",
        );
      }
      router.push(`${returnUrl.pathname}${returnUrl.search}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock consent failed.");
      setBusy(false);
    }
  }

  if (!consentId) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 font-sans">
        <h1 className="text-2xl font-semibold">Mock Consent</h1>
        <p className="mt-3 text-zinc-600">
          Missing consentId. Start from /aa-test.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16 font-sans text-zinc-900">
      <p className="text-sm uppercase tracking-wide text-zinc-500">
        Mock Account Aggregator
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Consent request</h1>
      <p className="mt-3 text-zinc-600">
        INFLORA requests DEPOSIT transaction data for personal inflation
        analysis (demo only).
      </p>
      <p className="mt-4 font-mono text-xs text-zinc-500">Consent: {consentId}</p>

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void complete("ACTIVE")}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          Consent Granted
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void complete("REJECTED")}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
