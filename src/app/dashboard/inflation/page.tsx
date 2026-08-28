import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { InflationPage } from "@/components/dashboard/DashboardSuitePages";

export default async function InflationRoute() {
  const data = await getDashboardData({ mode: "showcase" });
  return <DashboardPageFrame data={data} number="03" section="Macroeconomic Impact Analysis" title="Inflation." description="Compare your individualized expenditure against India’s Consumer Price Index and isolate the forces moving your personal rate."><InflationPage data={data} /></DashboardPageFrame>;
}