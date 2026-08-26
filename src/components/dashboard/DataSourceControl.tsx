import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard/types";

type DataSourceControlProps = {
  data: DashboardData;
  pendingSource: DashboardData["mode"] | null;
  onSourceChange: (source: DashboardData["mode"]) => void;
};

export function DataSourceControl({
  data,
  pendingSource,
  onSourceChange,
}: DataSourceControlProps) {
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
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
          {loadingLabel ? <p className="text-sm text-muted-foreground">{loadingLabel}</p> : null}
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
          <p className="sm:col-span-4">{transactionCoverage.toFixed(2)}% categorization coverage</p>
        </div>
      </CardContent>
    </Card>
  );
}
