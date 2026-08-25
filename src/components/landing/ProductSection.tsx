import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { dashboardMetrics, drivers, transactions } from "./data";
import {
  landingCopyClassName,
  landingPanelClassName,
  landingSectionClassName,
  landingTitleClassName,
  SectionEyebrow,
} from "./shared";

export function ProductSection() {
  return (
    <section
      aria-labelledby="product-title"
      className={cn(landingSectionClassName, "bg-background")}
    >
      <header>
        <SectionEyebrow>The Product / 04</SectionEyebrow>
      </header>
      <div className="mt-4 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
        <header>
          <h2
            id="product-title"
            className={landingTitleClassName}
          >
            Your economy, at a glance.
          </h2>
          <p className={cn(landingCopyClassName, "mt-5 max-w-md")}>
            The dashboard separates the AA connection state from the inflation
            result, so a successful data fetch never appears as a valid inflation
            estimate when categorization is insufficient.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href="/dashboard?mode=showcase">
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>
        <DashboardPreview />
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <aside
      aria-label="Dashboard metrics and activity preview"
      className={cn(landingPanelClassName, "bg-card p-4")}
    >
      <dl className="grid gap-3 sm:grid-cols-4">
        {dashboardMetrics.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-4">
            <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-3 font-mono text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section
          aria-labelledby="top-drivers-title"
          className="rounded-md border border-border p-5"
        >
          <h3 id="top-drivers-title" className="text-sm font-semibold">
            Top Drivers
          </h3>
          <ul className="mt-5 space-y-4">
            {drivers.map(([label, value, width]) => (
              <li key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-mono">{value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-labelledby="transaction-activity-title"
          className="rounded-md border border-border p-5"
        >
          <h3 id="transaction-activity-title" className="text-sm font-semibold">
            Transaction Activity
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Recent categorized transaction activity
              </caption>
              <thead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(([date, description, category, amount]) => (
                  <tr
                    key={`${date}-${description}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {date}
                    </td>
                    <td className="py-3 font-medium">{description}</td>
                    <td className="py-3 text-muted-foreground">{category}</td>
                    <td className="py-3 text-right font-mono">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </aside>
  );
}
