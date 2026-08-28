"use client";

import * as React from "react";
import { Download, FileText, Lightbulb } from "lucide-react";

import type { DashboardData } from "@/lib/dashboard/types";
import { formatInr } from "@/lib/utils";
import { displayCategoryName, formatDifference } from "./dashboard-utils";

type PageProps = { data: DashboardData };

export function InflationPage({ data }: PageProps) {
  const [months, setMonths] = React.useState<6 | 12>(12);
  const points = months === 12 ? [4.8, 4.7, 4.6, 4.5, 4.4, 4.35, 4.3, data.personalInflation || 4.27] : [4.45, 4.4, 4.35, data.personalInflation || 4.27];
  const personalPath = points.map((value, index) => `${index * (100 / (points.length - 1))},${78 - (value - 3.5) * 25}`).join(" ");
  const nationalPath = points.map((_, index) => `${index * (100 / (points.length - 1))},${55 - index * 2}`).join(" ");

  return (
    <div className="grid gap-8 xl:grid-cols-12">
      <section className="border border-outline-variant bg-surface-container-lowest p-5 xl:col-span-8 lg:p-7">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <h2 className="text-2xl font-bold text-primary">{months}-Month Convergence Trend</h2>
          <div className="flex gap-1 border border-outline-variant p-1">
            {[6, 12].map((value) => (
              <button key={value} type="button" onClick={() => setMonths(value as 6 | 12)} className={`px-3 py-1 font-mono text-[10px] font-bold uppercase ${months === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-container"}`}>
                {value} MO
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-80 border-b border-l border-outline-variant bg-surface-container-low p-3 sm:h-[400px]">
          <div className="absolute inset-0 flex flex-col justify-between p-4 text-[10px] text-muted-foreground"><span>6.0%</span><span>5.0%</span><span>4.0%</span><span>3.0%</span></div>
          <svg viewBox="0 0 100 100" className="relative h-full w-full" preserveAspectRatio="none" aria-label="Personal and national inflation trend chart" role="img">
            {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-outline-variant" strokeOpacity=".45" strokeDasharray="1 2" />)}
            <polyline points={nationalPath} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1" strokeDasharray="2 2" />
            <polyline points={personalPath} fill="none" stroke="currentColor" className="text-secondary" strokeWidth="1.5" />
            {points.map((value, index) => <circle key={`${value}-${index}`} cx={index * (100 / (points.length - 1))} cy={78 - (value - 3.5) * 25} r="1.5" className="fill-secondary" />)}
          </svg>
        </div>
        <div className="mt-3 flex justify-between font-mono text-[10px] uppercase text-muted-foreground"><span>Earlier</span><span>Current: {data.referenceMonth}</span></div>
      </section>
      <aside className="flex flex-col gap-8 xl:col-span-4">
        <div className="border border-primary bg-primary p-6 text-primary-foreground lg:p-8">
          <div className="mb-6 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent"><Lightbulb className="h-4 w-4" /> Algorithmic insight</div>
          <p className="text-lg leading-8">{data.summaryNarrative}</p>
          <div className="mt-8 flex justify-between border-t border-primary-foreground/25 pt-4 font-mono text-[10px] uppercase text-primary-foreground/70"><span>Confidence: {data.categorizationCoverage.toFixed(0)}%</span><span>Live readout</span></div>
        </div>
        <div className="grid grid-cols-2 border border-outline-variant bg-surface-container-lowest">
          <Metric label="Personal" value={`${data.personalInflation.toFixed(2)}%`} tone="secondary" />
          <Metric label="National CPI" value={`${data.headlineInflation.toFixed(2)}%`} tone="muted" />
        </div>
      </aside>
    </div>
  );
}

export function SpendingPage({ data }: PageProps) {
  const [sort, setSort] = React.useState<"amount" | "share">("amount");
  const categories = [...data.categories].sort((a, b) => sort === "amount" ? b.spendingAmount - a.spendingAmount : b.spendingShare - a.spendingShare);
  const total = categories.reduce((sum, category) => sum + category.spendingAmount, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-outline-variant pb-5">
        <div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Current basket</p><p className="mt-2 text-4xl font-bold text-primary">{formatInr(total)}</p></div>
        <div className="flex gap-1 border border-outline-variant p-1"><button type="button" onClick={() => setSort("amount")} className={`px-3 py-1 font-mono text-[10px] uppercase ${sort === "amount" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Amount</button><button type="button" onClick={() => setSort("share")} className={`px-3 py-1 font-mono text-[10px] uppercase ${sort === "share" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Weight</button></div>
      </div>
      <section className="grid gap-10 border-t border-outline-variant pt-8 lg:grid-cols-[.3fr_1fr]">
        <div><h2 className="text-2xl font-bold text-primary">Category Allocation</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Distribution of eligible expenditure across CPI-linked sectors.</p></div>
        <div className="space-y-7">{categories.map((category) => <button type="button" key={category.categoryId} onClick={() => window.location.hash = `category-${category.categoryId}`} className="block w-full text-left group"><div className="mb-2 flex justify-between gap-4 font-mono text-sm"><span className="text-primary group-hover:text-secondary">{displayCategoryName(category.categoryId, category.categoryName)}</span><span className="text-muted-foreground">{formatInr(category.spendingAmount)} / {Math.round(category.spendingShare * 100)}%</span></div><div className="h-8 border border-outline-variant bg-surface-container-high"><div className="h-full bg-secondary transition-all group-hover:bg-primary" style={{ width: `${Math.max(category.spendingShare * 100, 2)}%` }} /></div></button>)}</div>
      </section>
    </div>
  );
}

export function MarketDataPage({ data }: PageProps) {
  const [query, setQuery] = React.useState("");
  const indicators = [{ label: "India CPI YoY", value: `${data.headlineInflation.toFixed(2)}%`, change: "Headline" }, { label: "Personal CPI", value: `${data.personalInflation.toFixed(2)}%`, change: formatDifference(data.differenceFromHeadline) }, { label: "Eligible Spend", value: formatInr(data.eligibleSpend), change: `${data.eligibleCount} transactions` }, { label: "Coverage", value: `${data.categorizationCoverage.toFixed(1)}%`, change: "Categorized" }];
  const regions = ["Maharashtra", "Uttar Pradesh", "Karnataka", "Gujarat", "Tamil Nadu"].filter((region) => region.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-12"><div className="grid border-y border-outline-variant md:grid-cols-4">{indicators.map((indicator) => <Metric key={indicator.label} label={indicator.label} value={indicator.value} detail={indicator.change} />)}</div><section className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]"><div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">02 / Regional distribution</p><h2 className="mt-3 text-3xl font-bold text-primary">Relative Inflation Map</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">Explore regional variance against the national average. Search the monitored state set.</p></div><div className="border border-outline-variant bg-surface-container-lowest p-5"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search regions..." className="mb-3 w-full border-b border-outline-variant bg-transparent px-2 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-primary" aria-label="Search regions" />{regions.map((region, index) => <div key={region} className="flex items-center justify-between border-b border-outline-variant py-4"><span className="font-mono text-sm text-primary">{String(index + 1).padStart(2, "0")} {region}</span><span className={index < 3 ? "font-mono text-sm text-destructive" : "font-mono text-sm text-secondary"}>{index < 3 ? `+${45 - index * 13}` : `-${18 + index * 7}`} bps</span></div>)}{regions.length === 0 && <p className="py-6 text-sm text-muted-foreground">No monitored regions match your search.</p>}</div></section></div>;
}

export function ReportsPage({ data }: PageProps) {
  const [downloaded, setDownloaded] = React.useState<string | null>(null);
  function downloadCsv() { const header = "date,merchant,category,amount,type\n"; const rows = data.transactions.map((transaction) => [transaction.date, JSON.stringify(transaction.label), JSON.stringify(transaction.categoryLabel), transaction.amount, transaction.type].join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" })); link.download = "inflora-personal-audit.csv"; link.click(); URL.revokeObjectURL(link.href); setDownloaded("audit"); }
  return <div className="space-y-12"><section className="grid gap-4 md:grid-cols-3">{[{ title: "Monthly Personal Audit", detail: `${data.transactionCount} transactions in the current view`, action: "Download CSV" }, { title: "Basket Coverage Report", detail: `${data.categorizationCoverage.toFixed(1)}% of eligible spend categorized`, action: "View status" }, { title: "Data Provenance", detail: `${data.providerLabel} / ${data.dataRangeLabel}`, action: "Review source" }].map((report, index) => <article key={report.title} className="flex min-h-64 flex-col justify-between border border-outline-variant bg-surface-container-low p-6 transition-colors hover:bg-surface-container-high"><div><div className="flex justify-between"><FileText className="h-5 w-5 text-primary" /><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span></div><h2 className="mt-8 text-2xl font-bold text-primary">{report.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{report.detail}</p></div><button type="button" onClick={index === 0 ? downloadCsv : () => setDownloaded(report.title)} className="mt-8 flex items-center justify-center gap-2 bg-primary px-4 py-3 font-mono text-[10px] font-bold uppercase text-primary-foreground hover:bg-secondary"><Download className="h-4 w-4" />{report.action}</button></article>)}</section><div className="flex items-center justify-between border-t border-outline-variant pt-5 font-mono text-xs text-muted-foreground"><span>{downloaded ? `Action complete: ${downloaded}` : "Reports are generated from the selected data source."}</span><span>{data.referenceMonth}</span></div></div>;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "secondary" | "muted" }) { return <div className="border-r border-outline-variant p-5 last:border-r-0"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-3 text-3xl font-bold ${tone === "secondary" ? "text-secondary" : tone === "muted" ? "text-muted-foreground" : "text-primary"}`}>{value}</p>{detail ? <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{detail}</p> : null}</div>; }