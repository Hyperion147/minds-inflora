"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CircleAlert,
  CircleDashed,
  Database,
  Landmark,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/navigation/AppHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatInr } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard/types";

type DashboardViewProps = {
  data: DashboardData;
};

const NAV_ITEMS = [
  { label: "Overview", href: "#overview" },
  { label: "Spending", href: "#spending" },
  { label: "Inflation", href: "#inflation" },
  { label: "Transactions", href: "#transactions" },
];

export function DashboardView({ data }: DashboardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingSource, setPendingSource] = React.useState<DashboardData["mode"] | null>(null);
  const [transactionsOpen, setTransactionsOpen] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<DashboardData["transactions"][number] | null>(null);
  const [selectedCategory, setSelectedCategory] =
    React.useState<DashboardData["categories"][number] | null>(null);
  const visibleTransactions = data.transactions.slice(0, 10);
  const maxInflation = Math.max(
    data.personalInflation || 0,
    data.headlineInflation || 0,
    1,
  );
  const activePendingSource = isPending ? pendingSource : null;

  function switchDataSource(source: DashboardData["mode"]) {
    if (source === data.mode) {
      return;
    }

    setPendingSource(source);
    startTransition(() => {
      router.push(`/dashboard?mode=${source}`);
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        items={NAV_ITEMS}
        homeHref="/dashboard"
        desktopActions={
          <>
            <div className="w-40">
              <Select value={data.referenceMonth}>
                <SelectTrigger aria-label="Reference month">
                  <SelectValue placeholder="Reference month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={data.referenceMonth}>{data.referenceMonth}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>
              {data.sourcePill}
            </Badge>
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>
              {data.overallStatus}
            </Badge>
            <Separator orientation="vertical" className="h-7" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open user menu">
                  <Avatar>
                    <AvatarFallback>IN</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>INFLORA workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard?mode=showcase">Use showcase data</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/aa-test">Connect live accounts</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        mobileAccessory={
          <Badge variant={badgeVariantForTone(data.overallStatusTone)}>
            {data.overallStatus}
          </Badge>
        }
        mobileContent={
          <div className="space-y-2">
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>
              {data.sourcePill}
            </Badge>
            <p className="text-sm text-muted-foreground">{data.referenceMonth}</p>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <DataSourceControl
          data={data}
          pendingSource={activePendingSource}
          onSourceChange={switchDataSource}
        />

        <section id="overview" className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="min-w-0 border-primary bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardDescription>Your Personal Inflation</CardDescription>
                    {data.mode === "showcase" ? <Badge variant="secondary">Showcase data</Badge> : null}
                  </div>
                  <CardTitle className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
                    {data.calculationStatus === "OK"
                      ? `${data.personalInflation.toFixed(2)}%`
                      : data.state === "processing"
                        ? "Fetching data"
                        : data.state === "failed"
                          ? "Unavailable"
                          : "Insufficient data"}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground">
                  {data.direction === "ABOVE" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : data.direction === "BELOW" ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <CircleDashed className="h-4 w-4" />
                  )}
                  <span>
                    {data.calculationStatus === "OK"
                      ? `${formatDifference(data.differenceFromHeadline)} pp · ${formatDirectionLabel(data.direction)} national CPI`
                      : data.state === "processing"
                        ? "Provider processing"
                        : "Coverage required"}
                  </span>
                </div>
              </div>
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
                {data.calculationStatus === "OK" ? buildResultExplanation(data) : "Not enough categorized spending was available to calculate a reliable personal inflation estimate."}
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

          <Card className="min-w-0 bg-card">
            <CardHeader>
              <CardDescription>Compared with India&apos;s headline CPI</CardDescription>
              <CardTitle>You vs India</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ComparisonRow
                label="You"
                value={data.personalInflation}
                maxValue={maxInflation}
                muted={data.calculationStatus !== "OK"}
                displayValue={
                  data.calculationStatus === "OK" ? undefined : "Insufficient data"
                }
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
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Difference
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {data.calculationStatus === "OK"
                    ? `${formatDifference(data.differenceFromHeadline)} pp`
                    : "Insufficient data"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.calculationStatus === "OK"
                    ? buildComparisonSentence(data)
                    : "INFLORA needs more reliably categorized transactions before it can estimate your inflation."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          id="inflation"
          className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
        >
          <Card id="spending" className="min-w-0 bg-card">
            <CardHeader>
              <CardDescription>Where your money is going</CardDescription>
              <CardTitle>Spending breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.categories.length > 0 ? (
                <div className="space-y-5">
                  {data.categories.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      className="w-full space-y-2 rounded-sm text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 px-2 pt-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {displayCategoryName(category.categoryId, category.categoryName)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatInr(category.spendingAmount)} · {Math.round(category.spendingShare * 100)}% of eligible spending
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatDifference(category.contributionPercentagePoints)} pp
                        </Badge>
                      </div>
                      <div className="px-2 pb-2">
                        <Progress value={category.spendingShare * 100} aria-label={`${category.categoryName} share`} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No category breakdown yet"
                  description="Categories will appear once eligible transactions have been mapped into CPI-linked spending groups."
                />
              )}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card className="min-w-0 bg-card">
              <CardHeader>
                <CardDescription>Your basket is not the national CPI basket</CardDescription>
                <CardTitle>Why is my inflation different?</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topDrivers.length > 0 ? (
                  <TopDriversExplanation
                    data={data}
                    onSelectCategory={(categoryId) => {
                      const category = data.categories.find((item) => item.categoryId === categoryId);
                      if (category) {
                        setSelectedCategory(category);
                      }
                    }}
                  />
                ) : (
                  <EmptyState
                    title="No drivers available"
                    description="Inflation drivers will appear once INFLORA has a valid personal inflation result."
                  />
                )}
              </CardContent>
            </Card>

            <WhatAffectsYouMost
              data={data}
              onSelectCategory={(category) => setSelectedCategory(category)}
            />
          </div>
        </section>

        <section
          id="transactions"
          className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
        >
          <Card className="min-w-0 bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription>Recent transactions</CardDescription>
                <CardTitle>Transaction activity</CardTitle>
              </div>
              <Sheet open={transactionsOpen} onOpenChange={setTransactionsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline">View all transactions</Button>
                </SheetTrigger>
                <SheetContent side="right" className="max-w-3xl">
                  <SheetHeader>
                    <SheetTitle>All transactions</SheetTitle>
                    <SheetDescription>
                      {data.transactionCount} fetched transactions in this view
                    </SheetDescription>
                  </SheetHeader>
                  <div className="overflow-auto">
                    <TransactionsTable
                      transactions={data.transactions}
                      onSelectTransaction={setSelectedTransaction}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              {visibleTransactions.length > 0 ? (
                <TransactionsTable
                  transactions={visibleTransactions}
                  onSelectTransaction={setSelectedTransaction}
                />
              ) : (
                <EmptyState
                  title="No transactions available"
                  description="Transactions will appear here once financial data is available."
                />
              )}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card className="min-w-0 bg-card">
              <CardHeader>
                <CardDescription>Insights</CardDescription>
                <CardTitle>What INFLORA sees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.insights.map((insight) => (
                  <Alert key={insight.id}>
                    <CircleAlert className="mb-2 h-4 w-4" />
                    <AlertTitle>{insight.title}</AlertTitle>
                    <AlertDescription>{insight.body}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>

            <Card className="min-w-0 bg-card">
              <CardHeader>
                <CardDescription>Financial data</CardDescription>
                <CardTitle>Account and data status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatusStat icon={Landmark} label="Account Aggregator" value={data.aggregatorLabel} />
                  <StatusStat icon={Database} label="Provider" value={data.providerLabel} />
                  <StatusStat label="Connected accounts" value={String(data.connectedAccounts)} />
                  <StatusStat label="Transactions fetched" value={String(data.transactionCount)} />
                  <StatusStat label="Eligible transactions" value={String(data.eligibleCount)} />
                  <StatusStat label="Categorized transactions" value={String(data.mappedCategoryCount)} />
                  <StatusStat label="Data range" value={data.dataRangeLabel} />
                  <StatusStat label="Last updated" value={data.lastUpdatedLabel} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Account availability</p>
                    <Badge variant={badgeVariantForTone(data.overallStatusTone)}>
                      {data.overallStatus}
                    </Badge>
                  </div>

                  {data.accountLines.length > 0 ? (
                    <div className="space-y-2">
                      {data.accountLines.map((account, index) => (
                        <div
                          key={`${account.fipId}-${account.maskedAccount}-${index}`}
                          className="flex items-start justify-between gap-4 rounded-sm border border-border px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{account.fipId}</p>
                            <p className="text-sm text-muted-foreground">{account.maskedAccount}</p>
                            {account.description ? (
                              <p className="text-xs text-muted-foreground">{account.description}</p>
                            ) : null}
                          </div>
                          <Badge variant={badgeVariantForAccountStatus(account.status)}>
                            {account.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No account-level diagnostic data is available for this view.
                    </p>
                  )}

                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <TransactionDetailsSheet
          transaction={selectedTransaction}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTransaction(null);
            }
          }}
        />

        <CategoryDetailsSheet
          category={selectedCategory}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCategory(null);
            }
          }}
        />

        {data.state === "failed" && data.errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load your financial data.</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{data.errorMessage}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={data.mode === "live" ? "/dashboard?mode=live" : "/dashboard?mode=showcase"}>
                  <RefreshCcw className="h-4 w-4" />
                  Retry
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <footer className="border-t border-border pt-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>Last updated {data.lastUpdatedLabel}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/aa-test" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                Connect live accounts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function DataSourceControl({
  data,
  pendingSource,
  onSourceChange,
}: {
  data: DashboardData;
  pendingSource: DashboardData["mode"] | null;
  onSourceChange: (source: DashboardData["mode"]) => void;
}) {
  const categorizedCount = data.transactions.filter(
    (transaction) => transaction.includedInPersonalInflation,
  ).length;
  const transactionCoverage =
    data.eligibleCount > 0 ? (categorizedCount / data.eligibleCount) * 100 : 0;
  const loadingLabel =
    pendingSource === "showcase"
      ? "Loading showcase data..."
      : pendingSource === "live"
        ? "Loading live financial data..."
        : null;

  return (
    <Card className="min-w-0 border bg-card">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Data source
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={data.mode === "showcase" ? "default" : "outline"}
              size="sm"
              disabled={Boolean(pendingSource)}
              onClick={() => onSourceChange("showcase")}
            >
              {data.mode === "showcase" ? "●" : "○"} Showcase Dataset
            </Button>
            <Button
              type="button"
              variant={data.mode === "live" ? "default" : "outline"}
              size="sm"
              disabled={Boolean(pendingSource)}
              onClick={() => onSourceChange("live")}
            >
              {data.mode === "live" ? "●" : "○"} Live Account Aggregator
            </Button>
          </div>
          {loadingLabel ? (
            <p className="text-sm text-muted-foreground">{loadingLabel}</p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4 md:text-right">
          <div>
            <Badge variant={data.mode === "showcase" ? "secondary" : "success"}>
              {data.mode === "showcase" ? "Showcase data" : "Live Account Aggregator"}
            </Badge>
          </div>
          <p>{data.transactionCount} transactions</p>
          <p>{data.eligibleCount} eligible</p>
          <p>{categorizedCount} categorized</p>
          <p className="sm:col-span-4">
            {transactionCoverage.toFixed(2)}% categorization coverage
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ComparisonRow({
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

function TopDriversExplanation({
  data,
  onSelectCategory,
}: {
  data: DashboardData;
  onSelectCategory: (categoryId: string) => void;
}) {
  const maxContribution = Math.max(
    ...data.topDrivers.map((driver) => Math.abs(driver.contributionPercentagePoints)),
    1,
  );

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        INFLORA compares your actual spending basket with CPI-linked category inflation.
        Categories where you spend more, or where prices are moving faster, pull your
        personal inflation away from headline CPI.
      </p>

      <div className="space-y-4">
        {data.topDrivers.map((driver, index) => {
          const displayName = displayCategoryName(driver.categoryId, driver.categoryName);
          const width = Math.max(
            (Math.abs(driver.contributionPercentagePoints) / maxContribution) * 100,
            8,
          );

          return (
            <button
              key={driver.categoryId}
              type="button"
              className={cn(
                "w-full rounded-sm border border-border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                index === 0 && "border-primary",
              )}
              onClick={() => onSelectCategory(driver.categoryId)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{displayName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatInr(driver.spendingAmount)} · CPI {driver.cpiInflation.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {formatDifference(driver.contributionPercentagePoints)} pp
                  </p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Contribution
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${width}%` }}
                  role="img"
                  aria-label={`${displayName} contribution ${formatDifference(
                    driver.contributionPercentagePoints,
                  )} percentage points`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Alert>
        <CircleAlert className="mb-2 h-4 w-4" />
        <AlertTitle>Plain-English readout</AlertTitle>
        <AlertDescription>{buildResultExplanation(data)}</AlertDescription>
      </Alert>
    </div>
  );
}

function WhatAffectsYouMost({
  data,
  onSelectCategory,
}: {
  data: DashboardData;
  onSelectCategory: (category: DashboardData["categories"][number]) => void;
}) {
  const insights = buildBasketInsights(data);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="min-w-0 border bg-card">
      <CardHeader>
        <CardDescription>Basket intelligence</CardDescription>
        <CardTitle>What&apos;s affecting you most?</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {insights.map((insight, index) => (
          <button
            key={insight.label}
            type="button"
            className="flex items-start justify-between gap-4 rounded-sm border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => onSelectCategory(insight.category)}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {index + 1}. {insight.label}
              </p>
              <p className="mt-2 font-medium text-foreground">{insight.categoryName}</p>
            </div>
            <p className="text-right text-lg font-semibold text-foreground">{insight.value}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function TransactionsTable({
  transactions,
  onSelectTransaction,
}: {
  transactions: DashboardData["transactions"];
  onSelectTransaction: (transaction: DashboardData["transactions"][number]) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description / Merchant</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="hidden lg:table-cell">Confidence</TableHead>
          <TableHead className="hidden lg:table-cell">Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {transaction.displayDate}
            </TableCell>
            <TableCell className="max-w-[16rem]">
              <div className="truncate font-medium text-foreground">{transaction.label}</div>
            </TableCell>
            <TableCell>
              <Badge variant={transaction.categoryId === "uncategorized" ? "warning" : "secondary"}>
                {transaction.categoryLabel}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Badge variant={badgeVariantForConfidence(transaction.categoryConfidence)}>
                {transaction.categoryConfidence}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Badge variant={transaction.type === "DEBIT" ? "default" : "success"}>
                {transaction.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums text-foreground">
              <span className={transaction.type === "DEBIT" ? "text-foreground" : "text-primary"}>
                {transaction.type === "DEBIT" ? "-" : "+"}
                {formatInr(transaction.amount)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectTransaction(transaction)}
              >
                Inspect
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CategoryDetailsSheet({
  category,
  onOpenChange,
}: {
  category: DashboardData["categories"][number] | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(category)} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {category ? (
          <>
            <SheetHeader>
              <SheetTitle>
                {displayCategoryName(category.categoryId, category.categoryName)}
              </SheetTitle>
              <SheetDescription>
                Category contribution to your personal inflation basket
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <div className="rounded-sm border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Your spending
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatInr(category.spendingAmount)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricBlock label="Category CPI" value={`${category.cpiInflation.toFixed(2)}%`} />
                <MetricBlock
                  label="Contribution"
                  value={`${formatDifference(category.contributionPercentagePoints)} pp`}
                />
              </div>

              <Alert>
                <CircleAlert className="mb-2 h-4 w-4" />
                <AlertTitle>How this affects you</AlertTitle>
                <AlertDescription>
                  Your spending in this category contributes approximately{" "}
                  {formatDifference(category.contributionPercentagePoints)} percentage points to
                  your personal inflation.
                </AlertDescription>
              </Alert>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TransactionDetailsSheet({
  transaction,
  onOpenChange,
}: {
  transaction: DashboardData["transactions"][number] | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {transaction ? (
          <>
            <SheetHeader>
              <SheetTitle>{transaction.label}</SheetTitle>
              <SheetDescription>
                {transaction.displayDate} · {transaction.type === "DEBIT" ? "-" : "+"}
                {formatInr(transaction.amount)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <div className="rounded-sm border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Category
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={transaction.categoryId === "uncategorized" ? "warning" : "secondary"}
                  >
                    {transaction.categoryLabel}
                  </Badge>
                  <Badge variant={badgeVariantForConfidence(transaction.categoryConfidence)}>
                    {transaction.categoryConfidence}
                  </Badge>
                </div>
              </div>

              <div className="rounded-sm border border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Categorization
                </p>
                <div className="mt-4 grid gap-3 text-sm">
                  <DetailRow label="Confidence" value={transaction.categoryConfidence} />
                  <DetailRow
                    label="Method"
                    value={formatCategorizationMethod(transaction.categorizationMethod)}
                  />
                  <DetailRow
                    label="Matched"
                    value={transaction.categorizationSource ?? "—"}
                  />
                  <DetailRow
                    label="Included in personal inflation"
                    value={transaction.includedInPersonalInflation ? "Yes" : "No"}
                  />
                  {!transaction.eligible ? (
                    <DetailRow
                      label="Exclusion reason"
                      value={formatExclusionReason(transaction.exclusionReason)}
                    />
                  ) : null}
                </div>
              </div>

              {transaction.categoryId === "uncategorized" ? (
                <Alert variant="warning">
                  <CircleAlert className="mb-2 h-4 w-4" />
                  <AlertTitle>Uncategorized transaction</AlertTitle>
                  <AlertDescription>
                    INFLORA did not infer a category without a reliable merchant match, so
                    this transaction is not silently assigned to the inflation basket.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-sm border border border-border px-4 py-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
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

function badgeVariantForTone(
  tone: DashboardData["overallStatusTone"],
): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "destructive") return "destructive";
  if (tone === "neutral") return "secondary";
  return "default";
}

function badgeVariantForAccountStatus(
  status: string,
): "success" | "warning" | "destructive" | "secondary" {
  const normalized = status.toUpperCase();
  if (normalized === "READY" || normalized === "DELIVERED") return "success";
  if (normalized === "PENDING" || normalized === "PARTIAL") return "warning";
  if (normalized === "FAILED" || normalized === "TIMEOUT" || normalized === "DENIED" || normalized === "EXPIRED") {
    return "destructive";
  }
  return "secondary";
}

function badgeVariantForConfidence(
  confidence: DashboardData["transactions"][number]["categoryConfidence"],
): "success" | "warning" | "secondary" {
  if (confidence === "HIGH") return "success";
  if (confidence === "MEDIUM" || confidence === "LOW") return "warning";
  return "secondary";
}

function formatDifference(value: number): string {
  const absolute = value.toFixed(2);
  return value > 0 ? `+${absolute}` : absolute;
}

function formatDirectionLabel(direction: DashboardData["direction"]): string {
  if (direction === "ABOVE") return "above";
  if (direction === "BELOW") return "below";
  return "near";
}

function buildComparisonSentence(data: DashboardData): string {
  const absoluteDifference = Math.abs(data.differenceFromHeadline).toFixed(2);

  if (data.direction === "ABOVE") {
    return `You are experiencing ${absoluteDifference} percentage points higher inflation than the national average.`;
  }
  if (data.direction === "BELOW") {
    return `You are experiencing ${absoluteDifference} percentage points lower inflation than the national average.`;
  }
  return "Your inflation is close to the national average.";
}

function buildResultExplanation(data: DashboardData): string {
  if (data.calculationStatus !== "OK") {
    return "INFLORA needs more reliably categorized transactions before it can estimate your personal inflation.";
  }

  const [first, second, third] = data.topDrivers.map((driver) =>
    displayCategoryName(driver.categoryId, driver.categoryName),
  );
  const driverPhrase = [first, second, third].filter(Boolean).join(", ");

  if (!first) {
    return `Your personal inflation is ${data.personalInflation.toFixed(2)}%, compared with India's ${data.headlineInflation.toFixed(2)}% headline CPI.`;
  }

  const directionText =
    data.direction === "ABOVE"
      ? "above"
      : data.direction === "BELOW"
        ? "below"
        : "close to";

  return `Your personal inflation is ${data.personalInflation.toFixed(2)}%, ${directionText} India's ${data.headlineInflation.toFixed(2)}% headline CPI. ${first} is currently the largest upward contributor, followed by ${driverPhrase
    .split(", ")
    .slice(1)
    .join(" and ") || "the rest of your basket"}.`;
}

function buildBasketInsights(data: DashboardData): Array<{
  label: string;
  category: DashboardData["categories"][number];
  categoryName: string;
  value: string;
}> {
  if (data.categories.length === 0) {
    return [];
  }

  const largestPressureDriver = [...data.topDrivers].sort(
    (a, b) =>
      Math.abs(b.contributionPercentagePoints) - Math.abs(a.contributionPercentagePoints),
  )[0];
  const largestPressureCategory = largestPressureDriver
    ? data.categories.find((category) => category.categoryId === largestPressureDriver.categoryId)
    : undefined;
  const highestCpiCategory = [...data.categories].sort((a, b) => b.cpiInflation - a.cpiInflation)[0];
  const largestSpendCategory = [...data.categories].sort(
    (a, b) => b.spendingAmount - a.spendingAmount,
  )[0];

  return [
    largestPressureCategory
      ? {
          label: "Largest inflation pressure",
          category: largestPressureCategory,
          categoryName: displayCategoryName(
            largestPressureCategory.categoryId,
            largestPressureCategory.categoryName,
          ),
          value: `${formatDifference(largestPressureCategory.contributionPercentagePoints)} pp`,
        }
      : null,
    highestCpiCategory
      ? {
          label: "Highest CPI category in your basket",
          category: highestCpiCategory,
          categoryName: displayCategoryName(
            highestCpiCategory.categoryId,
            highestCpiCategory.categoryName,
          ),
          value: `${highestCpiCategory.cpiInflation.toFixed(2)}%`,
        }
      : null,
    largestSpendCategory
      ? {
          label: "Largest spending category",
          category: largestSpendCategory,
          categoryName: displayCategoryName(
            largestSpendCategory.categoryId,
            largestSpendCategory.categoryName,
          ),
          value: formatInr(largestSpendCategory.spendingAmount),
        }
      : null,
  ].filter((insight): insight is NonNullable<typeof insight> => insight !== null);
}

function displayCategoryName(categoryId: string, fallback: string): string {
  const names: Record<string, string> = {
    clothing_footwear: "Clothing & Footwear",
    education: "Education",
    food_beverages: "Food & Beverages",
    healthcare: "Healthcare",
    household_goods: "Household Goods",
    housing_utilities: "Housing & Utilities",
    information_communication: "Information & Communication",
    paan_tobacco_intoxicants: "Paan, Tobacco & Intoxicants",
    personal_care_misc: "Personal Care",
    recreation: "Recreation",
    restaurants_accommodation: "Restaurants & Accommodation",
    transport: "Transport",
    uncategorized: "Uncategorized",
  };

  return names[categoryId] ?? fallback;
}

function formatCategorizationMethod(
  method: DashboardData["transactions"][number]["categorizationMethod"],
): string {
  const labels: Record<typeof method, string> = {
    exact_merchant: "Exact Merchant",
    merchant_alias: "Merchant Alias",
    structured_narration: "Structured Narration",
    description_phrase: "Description Phrase",
    uncategorized: "Uncategorized",
  };

  return labels[method];
}

function formatExclusionReason(
  reason: DashboardData["transactions"][number]["exclusionReason"],
): string {
  return reason
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
