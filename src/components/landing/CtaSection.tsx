import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { landingPanelClassName } from "./shared";

export function CtaSection() {
  return (
    <section
      aria-labelledby="cta-title"
      className="mt-6 border border-border bg-card p-5 sm:p-8 lg:p-12"
    >
      <div
        className={cn(
          landingPanelClassName,
          "grid gap-8 bg-background p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8",
        )}
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            INFLORA / Personal Inflation Intelligence
          </p>
          <h2 id="cta-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.025em]">
            Know your inflation.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Because the economy you experience is the economy you spend in.
          </p>
        </header>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/dashboard?mode=showcase">
              Explore INFLORA
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#methodology">View methodology</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
