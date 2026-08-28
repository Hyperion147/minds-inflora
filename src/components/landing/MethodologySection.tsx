import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { methodologyCards } from "./data";
import {
  landingCopyClassName,
  landingPanelClassName,
  landingSectionClassName,
  landingTitleClassName,
  SectionEyebrow,
} from "./shared";

export function MethodologySection() {
  return (
    <section
      id="methodology"
      aria-labelledby="methodology-title"
      className={cn(
        landingSectionClassName,
        "scroll-mt-4 bg-card",
      )}
    >
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <header>
          <SectionEyebrow>Methodology / 05</SectionEyebrow>
          <h2
            id="methodology-title"
            className={cn(landingTitleClassName, "mt-4")}
          >
            Not another spending tracker.
          </h2>
          <p className={cn(landingCopyClassName, "mt-5 max-w-lg")}>
            INFLORA does not simply show where your money went. It estimates how
            changes in the prices of the things you actually buy affect your
            personal cost of living.
          </p>
        </header>
        <div className="space-y-5">
          <ul className="grid gap-4 md:grid-cols-3">
            {methodologyCards.map(([title, copy, Icon]) => (
              <li key={title}>
                <Card className="h-full bg-background shadow-none">
                  <CardContent className="">
                    <Icon className="h-5 w-5 text-primary mt-4" />
                    <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.14em]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {copy}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <figure
            className={cn(
              landingPanelClassName,
              "bg-background p-5 font-mono text-sm text-foreground",
            )}
          >
            <figcaption className="text-muted-foreground">
              Personal Inflation
            </figcaption>
            <p className="mt-3 text-lg" aria-label="Personal Inflation equals the sum of your category weight times category inflation">
              = Sum (Your Category Weight x Category Inflation)
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}
