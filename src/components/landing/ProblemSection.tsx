import { cn } from "@/lib/utils";

import {
  ComparisonPanel,
  landingPanelClassName,
  landingSectionClassName,
  landingTitleClassName,
  SectionEyebrow,
} from "./shared";

export function ProblemSection() {
  return (
    <section
      aria-labelledby="problem-title"
      className={cn(
        landingSectionClassName,
        "grid gap-10 bg-surface-container-low lg:grid-cols-[0.9fr_1.1fr] lg:gap-12",
      )}
    >
      <header>
        <SectionEyebrow>The Problem / 02</SectionEyebrow>
        <h2
          id="problem-title"
          className={cn(landingTitleClassName, "mt-4")}
        >
          4.45% inflation doesn&apos;t tell your story.
        </h2>
        <p className="mt-6 max-w-md text-pretty text-2xl font-semibold leading-[1.25] text-foreground">
          Headline CPI is an average. Your spending isn&apos;t.
        </p>
      </header>
      <aside
        className={cn(
          landingPanelClassName,
          "grid overflow-hidden bg-card md:grid-cols-[1fr_auto_1fr]",
        )}
      >
        <ComparisonPanel
          label="Headline CPI"
          value="4.45%"
          copy="A generic national inflation figure."
        />
        <div className="flex items-center justify-center border-y border-border p-6 md:border-x md:border-y-0">
          <div className="text-center font-mono">
            <p className="text-xl font-semibold text-primary">+2.37</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              percentage points
            </p>
          </div>
        </div>
        <ComparisonPanel
          label="Your Inflation"
          value="6.82%"
          copy="Because your basket is different."
          emphasized
        />
      </aside>
    </section>
  );
}
