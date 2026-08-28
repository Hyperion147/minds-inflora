import { CircleAlert, Database, Landmark } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardData } from "@/lib/dashboard/types";
import { formatInr } from "@/lib/utils";

import { EmptyState, StatusStat } from "./dashboard-primitives";
import {
  badgeVariantForAccountStatus,
  badgeVariantForConfidence,
  badgeVariantForTone,
} from "./dashboard-utils";

type TransactionsSectionProps = {
  data: DashboardData;
  visibleTransactions: DashboardData["transactions"];
  transactionsOpen: boolean;
  onTransactionsOpenChange: (open: boolean) => void;
  onSelectTransaction: (transaction: DashboardData["transactions"][number]) => void;
};

export function TransactionsSection({
  data,
  visibleTransactions,
  transactionsOpen,
  onTransactionsOpenChange,
  onSelectTransaction,
}: TransactionsSectionProps) {
  return (
    <section
      id="transactions"
      aria-labelledby="dashboard-transactions-title"
      className="grid gap-px border-b border-outline-variant bg-outline-variant xl:grid-cols-[1.15fr_0.85fr]"
    >
      <Card className="min-w-0 border-0 bg-surface-container-lowest">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-outline-variant">
          <header>
            <CardDescription>Recent transactions</CardDescription>
            <CardTitle id="dashboard-transactions-title">Transaction activity</CardTitle>
          </header>
          <Sheet open={transactionsOpen} onOpenChange={onTransactionsOpenChange}>
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
                  onSelectTransaction={onSelectTransaction}
                />
              </div>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          {visibleTransactions.length > 0 ? (
            <TransactionsTable
              transactions={visibleTransactions}
              onSelectTransaction={onSelectTransaction}
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
        <Card className="min-w-0 border-0 bg-surface-container-low">
          <CardHeader className="border-b border-outline-variant">
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

        <Card className="min-w-0 border-0 bg-surface-container-lowest">
          <CardHeader className="border-b border-outline-variant">
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
              <div className="space-y-2">
                {data.accountLines.map((account) => (
                  <div
                    key={`${account.fipId}-${account.maskedAccount}`}
                    className="flex items-start justify-between gap-4 border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {account.description ?? account.maskedAccount}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.fipId}</p>
                    </div>
                    <Badge variant={badgeVariantForAccountStatus(account.status)}>
                      {account.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
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
