import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const landingSectionClassName =
  "border-b border-primary px-4 py-16 sm:px-8 lg:px-12 lg:py-20";

export const landingPanelClassName = "border border-border";

export const landingTitleClassName =
  "text-balance text-4xl font-bold leading-[1.05] tracking-[-0.025em] sm:text-5xl";

export const landingCopyClassName =
  "text-pretty text-sm leading-6 text-muted-foreground";

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase leading-4 tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

export function TechnicalLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute border border-primary bg-background px-2 py-1 font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetricBar({
  label,
  value,
  width,
  muted,
}: {
  label: string;
  value: string;
  width: string;
  muted?: boolean;
}) {
  return (
    <figure>
      <figcaption className="flex justify-between gap-4 font-mono text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
      </figcaption>
      <div className="mt-2 h-1 overflow-hidden bg-muted">
        <div
          aria-hidden="true"
          className={cn(
            "h-full bg-primary",
            muted && "bg-muted-foreground",
          )}
          style={{ width }}
        />
      </div>
    </figure>
  );
}

export function ComparisonPanel({
  label,
  value,
  copy,
  emphasized,
}: {
  label: string;
  value: string;
  copy: string;
  emphasized?: boolean;
}) {
  return (
    <article className="p-6 sm:p-7">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </h3>
      <p
        className={cn(
          "mt-5 font-mono text-5xl font-semibold leading-none",
          emphasized && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p>
    </article>
  );
}
