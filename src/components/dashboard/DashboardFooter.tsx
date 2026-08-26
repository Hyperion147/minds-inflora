import Link from "next/link";
import { ArrowRight } from "lucide-react";

type DashboardFooterProps = {
  lastUpdatedLabel: string;
};

export function DashboardFooter({ lastUpdatedLabel }: DashboardFooterProps) {
  return (
    <footer className="border-t border-border pt-4 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Last updated {lastUpdatedLabel}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/aa-test"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Connect live accounts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
