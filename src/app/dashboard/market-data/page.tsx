import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { MarketDataPage } from "@/components/dashboard/DashboardSuitePages";

export default async function MarketDataRoute() {
  const data = await getDashboardData({ mode: "showcase" });
  return <DashboardPageFrame data={data} number="05" section="Market Intelligence" title="Market Data." description="Track the economic context around your basket, from headline CPI to regional variance and data coverage."><MarketDataPage data={data} /></DashboardPageFrame>;
}