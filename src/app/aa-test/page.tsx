import { Suspense } from "react";
import { AaTestPanel } from "@/components/aa/AaTestPanel";
import { getAppEnv } from "@/lib/env";

export default function AaTestPage() {
  let providerLabel = "Mock";
  try {
    const env = getAppEnv();
    providerLabel =
      env.AA_PROVIDER === "setu"
        ? env.setu?.SETU_ENVIRONMENT === "production"
          ? "Setu Production"
          : "Setu Sandbox"
        : "Mock";
  } catch {
    providerLabel = "Configuration error";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-zinc-600">Loading…</p>}>
        <AaTestPanel providerLabel={providerLabel} />
      </Suspense>
    </main>
  );
}
