import Link from "next/link";
import {
  AlertCircle,
  CircleDashed,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard/types";
import { formatInr } from "@/lib/utils";

import { ComparisonRow, MetricBlock } from "./dashboard-primitives";
import {
  buildComparisonSentence,
  buildResultExplanation,
  formatDifference,
} from "./dashboard-utils";

type OverviewSectionProps = {
  data: DashboardData;
  maxInflation: number;
};

export function OverviewSection({ data, maxInflation }: OverviewSectionProps) {
  return (
    <section
      id="overview"
      aria-labelledby="dashboard-overview-title"
      className="grid gap-px border-b border-outline-variant bg-outline-variant lg:grid-cols-[1.4fr_0.9fr]"
    >
      <Card className="min-w-0 border-0 bg-surface-container-lowest">
        <CardHeader className="border-b border-outline-variant pb-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardDescription>Your Personal Inflation</CardDescription>
                {data.mode === "showcase" ? <Badge variant="secondary">Showcase data</Badge> : null}
              </div>
              <CardTitle
                id="dashboard-overview-title"
                className="mt-3 text-6xl font-extrabold leading-none tracking-[-0.04em] text-primary sm:text-7xl"
              >
                {data.calculationStatus === "OK"
                  ? `${data.personalInflation.toFixed(2)}%`
                  : data.state === "processing"
                    ? "Fetching data"
                    : data.state === "failed"
                      ? "Unavailable"
                      : "Insufficient data"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
              {data.direction === "ABOVE" ? (
                <TrendingUp className="h-4 w-4" />
              ) : data.direction === "BELOW" ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <CircleDashed className="h-4 w-4" />
              )}
              <span>
                {data.calculationStatus === "OK"
                  ? `${formatDifference(data.differenceFromHeadline)} pp · ${data.direction === "ABOVE" ? "above" : data.direction === "BELOW" ? "below" : "near"} national CPI`
                  : data.state === "processing"
                    ? "Provider processing"
                    : "Coverage required"}
              </span>
            </div>
          </header>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.calculationStatus === "OK" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricBlock label="Headline CPI" value={`${data.headlineInflation.toFixed(2)}%`} />
              <MetricBlock
                label="Difference"
                value={`${formatDifference(data.differenceFromHeadline)} pp`}
              />
              <MetricBlock label="Eligible spending" value={formatInr(data.eligibleSpend)} />
            </div>
          ) : (
            <Alert variant={data.state === "failed" ? "destructive" : "warning"}>
              <AlertCircle className="mb-2 h-4 w-4" />
              <AlertTitle>
                {data.state === "processing"
                  ? "Fetching your financial data..."
                  : "Insufficient data"}
              </AlertTitle>
              <AlertDescription>
                {data.state === "processing"
                  ? "INFLORA is waiting for your provider to finish preparing financial data."
                  : data.insufficiencyMessage ||
                    "INFLORA fetched your financial transactions successfully, but not enough transactions could be reliably categorized to calculate your personal inflation."}
              </AlertDescription>
            </Alert>
          )}

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {data.calculationStatus === "OK"
              ? buildResultExplanation(data)
              : "Not enough categorized spending was available to calculate a reliable personal inflation estimate."}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricBlock label="Eligible spend" value={formatInr(data.eligibleSpend)} />
            <MetricBlock label="Categorized spend" value={formatInr(data.categorizedSpend)} />
            <MetricBlock
              label="Categorization coverage"
              value={`${data.categorizationCoverage.toFixed(1)}%`}
            />
          </div>

          {data.calculationStatus !== "OK" ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="default" asChild>
                <Link href="/aa-test">Connect live accounts</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard?mode=showcase">View showcase dataset</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="min-w-0 border-0 bg-surface-container-low">
        <CardHeader className="border-b border-outline-variant">
          <CardDescription>Compared with India&apos;s headline CPI</CardDescription>
          <CardTitle>You vs India</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ComparisonRow
            label="You"
            value={data.personalInflation}
            maxValue={maxInflation}
            muted={data.calculationStatus !== "OK"}
            displayValue={data.calculationStatus === "OK" ? undefined : "Insufficient data"}
          />
          <ComparisonRow
            label="India"
            value={data.headlineInflation}
            maxValue={maxInflation}
            muted={data.calculationStatus !== "OK" && data.headlineInflation <= 0}
            displayValue={
              data.calculationStatus !== "OK" && data.headlineInflation <= 0
                ? "Unavailable"
                : undefined
            }
          />
          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Difference
            </p>
            <p className="mt-2 text-4xl font-bold text-primary">
              {data.calculationStatus === "OK"
                ? `${formatDifference(data.differenceFromHeadline)} pp`
                : "Insufficient data"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.calculationStatus === "OK"
                ? buildComparisonSentence(data)
                : "INFLORA needs more reliably categorized transactions before it can estimate your inflation."}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
