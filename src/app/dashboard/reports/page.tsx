import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { ReportsPage } from "@/components/dashboard/DashboardSuitePages";

export default async function ReportsRoute() {
  const data = await getDashboardData({ mode: "showcase" });
  return <DashboardPageFrame data={data} number="06" section="Intelligence Exports" title="Reports." description="Generate portable views of your personal inflation analysis, with provenance tied to the active data source."><ReportsPage data={data} /></DashboardPageFrame>;
}