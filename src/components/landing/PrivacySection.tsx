import { MoveRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { privacyNodes, privacyPoints } from "./data";
import {
  landingCopyClassName,
  landingPanelClassName,
  landingSectionClassName,
  landingTitleClassName,
  SectionEyebrow,
} from "./shared";

export function PrivacySection() {
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className={cn(
        landingSectionClassName,
        "scroll-mt-4 bg-background",
      )}
    >
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-12">
        <header>
          <SectionEyebrow>Privacy / 06</SectionEyebrow>
          <h2
            id="privacy-title"
            className={cn(landingTitleClassName, "mt-4")}
          >
            Your financial data should remain yours.
          </h2>
          <p className={cn(landingCopyClassName, "mt-5 max-w-lg")}>
            INFLORA is designed around India&apos;s Account Aggregator model:
            consent-based access to financial information, without password
            sharing or banking credential collection.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {privacyPoints.map((point) => (
              <li key={point}>
                <Badge variant="secondary" className="bg-card">
                  {point}
                </Badge>
              </li>
            ))}
          </ul>
        </header>
        <PrivacyDiagram />
      </div>
    </section>
  );
}

function PrivacyDiagram() {
  return (
    <aside
      aria-label="Consent-based data flow"
      className={cn(landingPanelClassName, "bg-card p-5")}
    >
      <ol className="grid gap-3">
        {privacyNodes.map(([label, Icon], index) => (
          <li key={label}>
            <div className="flex items-center gap-4 rounded-md border border-border p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-border">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.14em]">
                {label}
              </span>
            </div>
            {index < privacyNodes.length - 1 ? (
              <div className="flex h-5 items-center justify-center">
                <MoveRight className="h-4 w-4 rotate-90 text-muted-foreground" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}
