import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ComparisonRow({
  label,
  value,
  maxValue,
  muted = false,
  displayValue,
}: {
  label: string;
  value: number;
  maxValue: number;
  muted?: boolean;
  displayValue?: string;
}) {
  const width = Math.max((value / maxValue) * 100, value > 0 ? 18 : 0);
  const visibleValue = displayValue ?? `${value.toFixed(2)}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{visibleValue}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary", muted && "bg-muted-foreground")}
          style={{ width: `${width}%` }}
          role="img"
          aria-label={`${label}: ${visibleValue}`}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-sm border border-border px-4 py-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function StatusStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-border px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
