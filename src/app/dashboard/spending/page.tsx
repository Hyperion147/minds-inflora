import { getDashboardRouteData } from "@/lib/dashboard/getDashboardRouteData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { SpendingPage } from "@/components/dashboard/DashboardSuitePages";

export default async function SpendingRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboardRouteData(searchParams);
  return <DashboardPageFrame data={data} number="02" section="Personal Expenditure" title="Spending." description="See how your eligible expenditure is distributed across the categories that shape your personal inflation basket."><SpendingPage data={data} /></DashboardPageFrame>;
}