import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard/types";

import { AppHeader } from "@/components/navigation/AppHeader";
import { DASHBOARD_NAV_ITEMS, badgeVariantForTone } from "./dashboard-utils";

type DashboardPageFrameProps = {
  data: DashboardData;
  number: string;
  section: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function DashboardPageFrame({
  data,
  number,
  section,
  title,
  description,
  children,
}: DashboardPageFrameProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        items={DASHBOARD_NAV_ITEMS}
        homeHref="/dashboard"
        variant="dashboard"
        desktopActions={
          <>
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>{data.sourcePill}</Badge>
            <Badge variant={badgeVariantForTone(data.overallStatusTone)}>{data.overallStatus}</Badge>
          </>
        }
        mobileAccessory={<Badge variant={badgeVariantForTone(data.overallStatusTone)}>{data.overallStatus}</Badge>}
        mobileContent={<p className="font-mono text-xs text-muted-foreground">{data.sourcePill}</p>}
      />
      <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-10 px-4 pb-16 pt-24 sm:px-6 lg:ml-72 lg:px-12 lg:pt-28">
        <header className="border-b border-outline-variant pb-8">
          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="bg-primary px-3 py-1 text-primary-foreground">{number}</span>
            <span>{section}</span>
          </div>
          <h1 className="text-6xl font-extrabold uppercase leading-none tracking-[-0.04em] text-primary">{title}</h1>
          <p className="mt-5 max-w-2xl border-l border-outline-variant pl-5 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </header>
        {children}
      </main>
    </div>
  );
}