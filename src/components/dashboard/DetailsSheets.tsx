import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DashboardData } from "@/lib/dashboard/types";

import { MetricBlock, DetailRow } from "./dashboard-primitives";
import {
  badgeVariantForConfidence,
  displayCategoryName,
  formatCategorizationMethod,
  formatDifference,
  formatExclusionReason,
} from "./dashboard-utils";

export function CategoryDetailsSheet({
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
              <SheetTitle>{displayCategoryName(category.categoryId, category.categoryName)}</SheetTitle>
              <SheetDescription>
                Category contribution to your personal inflation basket
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Your spending
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(category.spendingAmount)}
                  </p>
                </CardContent>
              </Card>

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

export function TransactionDetailsSheet({
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
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(transaction.amount)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <Card className="border-border">
                <CardContent className="p-4">
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
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Categorization
                  </p>
                  <div className="mt-4 grid gap-3 text-sm">
                    <DetailRow label="Confidence" value={transaction.categoryConfidence} />
                    <DetailRow
                      label="Method"
                      value={formatCategorizationMethod(transaction.categorizationMethod)}
                    />
                    <DetailRow label="Matched" value={transaction.categorizationSource ?? "—"} />
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
                </CardContent>
              </Card>

              {transaction.categoryId === "uncategorized" ? (
                <Alert variant="warning">
                  <CircleAlert className="mb-2 h-4 w-4" />
                  <AlertTitle>Uncategorized transaction</AlertTitle>
                  <AlertDescription>
                    INFLORA did not infer a category without a reliable merchant match, so this
                    transaction is not silently assigned to the inflation basket.
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
