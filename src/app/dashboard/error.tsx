"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-6 py-16">
      <Alert variant="destructive">
        <AlertTitle>Unable to load your financial data.</AlertTitle>
        <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
          <span>Please try again. If the provider is still processing, the dashboard will recover once data is available.</span>
          <Button onClick={() => reset()} variant="outline">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
