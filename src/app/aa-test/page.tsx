import { Suspense } from "react";
import { AaTestPanel } from "@/components/aa/AaTestPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppEnv } from "@/lib/env";

export default function AaTestPage() {
  let providerLabel = "Demo provider";
  try {
    const env = getAppEnv();
    providerLabel =
      env.AA_PROVIDER === "setu"
        ? env.setu?.SETU_ENVIRONMENT === "production"
          ? "Setu Production"
          : "Setu Sandbox"
        : "Demo provider";
  } catch {
    providerLabel = "Configuration error";
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Suspense
        fallback={
          <Card className="border-dashed bg-card">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        }
      >
        <AaTestPanel providerLabel={providerLabel} />
      </Suspense>
    </main>
  );
}
