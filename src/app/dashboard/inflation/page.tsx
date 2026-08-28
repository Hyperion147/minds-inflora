import { getDashboardRouteData } from "@/lib/dashboard/getDashboardRouteData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { InflationPage } from "@/components/dashboard/DashboardSuitePages";

export default async function InflationRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboardRouteData(searchParams);
  return <DashboardPageFrame data={data} number="03" section="Macroeconomic Impact Analysis" title="Inflation." description="Compare your individualized expenditure against India’s Consumer Price Index and isolate the forces moving your personal rate."><InflationPage data={data} /></DashboardPageFrame>;
}