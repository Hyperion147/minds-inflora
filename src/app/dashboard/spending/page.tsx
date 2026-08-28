import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { DashboardPageFrame } from "@/components/dashboard/DashboardPageFrame";
import { SpendingPage } from "@/components/dashboard/DashboardSuitePages";

export default async function SpendingRoute() {
  const data = await getDashboardData({ mode: "showcase" });
  return <DashboardPageFrame data={data} number="02" section="Personal Expenditure" title="Spending." description="See how your eligible expenditure is distributed across the categories that shape your personal inflation basket."><SpendingPage data={data} /></DashboardPageFrame>;
}