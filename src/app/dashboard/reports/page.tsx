import { getDashboardRouteData } from "@/lib/dashboard/getDashboardRouteData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { ReportsPage } from "@/components/dashboard/DashboardSuitePages";

export default async function ReportsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboardRouteData(searchParams);
  return <DashboardPageFrame data={data} number="06" section="Intelligence Exports" title="Reports." description="Generate portable views of your personal inflation analysis, with provenance tied to the active data source."><ReportsPage data={data} /></DashboardPageFrame>;
}