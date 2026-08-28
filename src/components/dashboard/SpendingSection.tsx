import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardData } from "@/lib/dashboard/types";
import { cn, formatInr } from "@/lib/utils";

import { EmptyState } from "./dashboard-primitives";
import {
  buildBasketInsights,
  buildResultExplanation,
  displayCategoryName,
  formatDifference,
} from "./dashboard-utils";

type SpendingSectionProps = {
  data: DashboardData;
  onSelectCategory: (category: DashboardData["categories"][number]) => void;
};

export function SpendingSection({ data, onSelectCategory }: SpendingSectionProps) {
  return (
    <section
      id="inflation"
      aria-labelledby="dashboard-spending-title"
      className="grid gap-px border-b border-outline-variant bg-outline-variant xl:grid-cols-[1.15fr_0.85fr]"
    >
      <Card id="spending" className="min-w-0 border-0 bg-surface">
        <CardHeader className="border-b border-outline-variant">
          <CardDescription>Where your money is going</CardDescription>
          <CardTitle id="dashboard-spending-title">Spending breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.categories.length > 0 ? (
            <div className="space-y-5">
              {data.categories.map((category) => (
                <button
                  key={category.categoryId}
                  type="button"
                  className="w-full space-y-2 border-b border-outline-variant px-2 py-3 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelectCategory(category)}
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
                    <Progress
                      value={category.spendingShare * 100}
                      aria-label={`${category.categoryName} share`}
                    />
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

      <div className="min-w-0 space-y-px bg-outline-variant">
        <Card className="min-w-0 border-0 bg-surface-container-low">
          <CardHeader className="border-b border-outline-variant">
            <CardDescription>Your basket is not the national CPI basket</CardDescription>
            <CardTitle>Why is my inflation different?</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topDrivers.length > 0 ? (
              <TopDriversExplanation
                data={data}
                onSelectCategory={(categoryId) => {
                  const category = data.categories.find(
                    (item) => item.categoryId === categoryId,
                  );

                  if (category) {
                    onSelectCategory(category);
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

        <WhatAffectsYouMost data={data} onSelectCategory={onSelectCategory} />
      </div>
    </section>
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
        Categories where you spend more, or where prices are moving faster, pull your personal
        inflation away from headline CPI.
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
                "w-full border border-border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
              <div className="mt-4 h-1 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary"
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
            className="flex items-start justify-between gap-4 border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
