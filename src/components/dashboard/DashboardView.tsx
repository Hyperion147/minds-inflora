"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, RefreshCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/navigation/AppHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { DashboardData } from "@/lib/dashboard/types";

import { CategoryDetailsSheet, TransactionDetailsSheet } from "./DetailsSheets";
import { DashboardFooter } from "./DashboardFooter";
import { DataSourceControl } from "./DataSourceControl";
import { OverviewSection } from "./OverviewSection";
import { SpendingSection } from "./SpendingSection";
import { TransactionsSection } from "./TransactionsSection";
import { DASHBOARD_NAV_ITEMS, badgeVariantForTone } from "./dashboard-utils";

type DashboardViewProps = {
  data: DashboardData;
};

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
  const maxInflation = Math.max(data.personalInflation || 0, data.headlineInflation || 0, 1);
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
        items={DASHBOARD_NAV_ITEMS}
        homeHref="/dashboard"
        variant="dashboard"
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
        mobileAccessory={<Badge variant={badgeVariantForTone(data.overallStatusTone)}>{data.overallStatus}</Badge>}
        mobileContent={
          <div className="space-y-2">
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>{data.sourcePill}</Badge>
            <p className="text-sm text-muted-foreground">{data.referenceMonth}</p>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-8 px-4 pb-12 pt-24 sm:px-6 lg:ml-72 lg:px-12 lg:pt-28">
        <header className="flex flex-col justify-between gap-6 border-b border-outline-variant pb-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="bg-primary px-3 py-1 text-primary-foreground">01</span>
              <span>Dashboard / Personal Inflation Intelligence</span>
            </div>
            <h1 className="text-5xl font-extrabold uppercase leading-none tracking-[-0.04em] text-primary sm:text-6xl">Overview.</h1>
            <p className="mt-5 border-l border-outline-variant pl-4 text-sm leading-6 text-muted-foreground sm:pl-5 sm:text-base sm:leading-7">
              A precise view of how your spending basket is moving against India&apos;s headline CPI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-l border-outline-variant pl-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:gap-3 sm:pl-5 sm:text-[11px] sm:tracking-[0.12em]">
            <span>{data.referenceMonth}</span>
            <span className="h-4 w-px bg-outline-variant" />
            <span>{data.sourcePill}</span>
          </div>
        </header>
        <DataSourceControl
          data={data}
          pendingSource={activePendingSource}
          onSourceChange={switchDataSource}
        />

        <OverviewSection data={data} maxInflation={maxInflation} />

        <SpendingSection data={data} onSelectCategory={setSelectedCategory} />

        <TransactionsSection
          data={data}
          visibleTransactions={visibleTransactions}
          transactionsOpen={transactionsOpen}
          onTransactionsOpenChange={setTransactionsOpen}
          onSelectTransaction={setSelectedTransaction}
        />

        <DashboardFooter lastUpdatedLabel={data.lastUpdatedLabel} />
      </main>

      <CategoryDetailsSheet
        category={selectedCategory}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategory(null);
          }
        }}
      />

      <TransactionDetailsSheet
        transaction={selectedTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransaction(null);
          }
        }}
      />

      {data.state === "processing" ? (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="max-w-sm shadow-lg">
            <RefreshCcw className="mb-2 h-4 w-4 animate-spin" />
            <AlertTitle>Refreshing data</AlertTitle>
            <AlertDescription>
              INFLORA is still waiting for your financial provider to finish preparing your data.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {data.state === "failed" ? (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant="destructive" className="max-w-sm shadow-lg">
            <CircleAlert className="mb-2 h-4 w-4" />
            <AlertTitle>Unable to load live data</AlertTitle>
            <AlertDescription>
              The selected data source could not be loaded. Try showcase mode or reconnect later.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
