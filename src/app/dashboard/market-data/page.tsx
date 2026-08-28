import { getDashboardRouteData } from "@/lib/dashboard/getDashboardRouteData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { MarketDataPage } from "@/components/dashboard/DashboardSuitePages";

export default async function MarketDataRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboardRouteData(searchParams);
  return <DashboardPageFrame data={data} number="05" section="Market Intelligence" title="Market Data." description="Track the economic context around your basket, from headline CPI to regional variance and data coverage."><MarketDataPage data={data} /></DashboardPageFrame>;
}