import { MoveRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { processSteps } from "./data";
import {
  landingPanelClassName,
  landingSectionClassName,
  landingTitleClassName,
  SectionEyebrow,
} from "./shared";

export function ProcessSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="process-title"
      className={cn(landingSectionClassName, "scroll-mt-4 bg-card")}
    >
      <header>
        <SectionEyebrow>The System / 03</SectionEyebrow>
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2
            id="process-title"
            className={cn(landingTitleClassName, "max-w-xl")}
          >
            From transactions to personal inflation.
          </h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            A consent-led data pipeline converts spending into CPI-linked weights,
            then compares your result with the national headline.
          </p>
        </div>
      </header>
      <ol
        className={cn(
          landingPanelClassName,
          "mt-10 grid overflow-hidden md:grid-cols-4",
        )}
      >
        {processSteps.map((step, index) => (
          <ProcessStep
            key={step.title}
            step={step}
            isLast={index === processSteps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

function ProcessStep({
  step,
  isLast,
}: {
  step: (typeof processSteps)[number];
  isLast: boolean;
}) {
  const Icon = step.icon;

  return (
    <li
      className={cn(
        "relative min-h-60 p-6 sm:p-7",
        !isLast &&
          "border-b border-border md:border-b-0 md:border-r",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">{step.number}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-8 text-sm font-semibold uppercase leading-5 tracking-[0.16em]">
        {step.title}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{step.copy}</p>
    </li>
  );
}
