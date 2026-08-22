import { Suspense } from "react";
import MockConsentClient from "./MockConsentClient";

export default function MockConsentPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-6 py-16 font-sans">
          Loading mock consent…
        </main>
      }
    >
      <MockConsentClient />
    </Suspense>
  );
}
