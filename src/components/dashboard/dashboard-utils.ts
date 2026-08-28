import type { DashboardData } from "@/lib/dashboard/types";

export const DASHBOARD_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Spending", href: "/dashboard/spending" },
  { label: "Inflation", href: "/dashboard/inflation" },
  { label: "Insights", href: "/dashboard#transactions" },
  { label: "Market Data", href: "/dashboard/market-data" },
  { label: "Reports", href: "/dashboard/reports" },
] as const;

export function badgeVariantForTone(
  tone: DashboardData["overallStatusTone"],
): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "destructive") return "destructive";
  if (tone === "neutral") return "secondary";
  return "default";
}

export function badgeVariantForAccountStatus(
  status: string,
): "success" | "warning" | "destructive" | "secondary" {
  const normalized = status.toUpperCase();
  if (normalized === "READY" || normalized === "DELIVERED") return "success";
  if (normalized === "PENDING" || normalized === "PARTIAL") return "warning";
  if (
    normalized === "FAILED" ||
    normalized === "TIMEOUT" ||
    normalized === "DENIED" ||
    normalized === "EXPIRED"
  ) {
    return "destructive";
  }
  return "secondary";
}

export function badgeVariantForConfidence(
  confidence: DashboardData["transactions"][number]["categoryConfidence"],
): "success" | "warning" | "secondary" {
  if (confidence === "HIGH") return "success";
  if (confidence === "MEDIUM" || confidence === "LOW") return "warning";
  return "secondary";
}

export function formatDifference(value: number): string {
  const absolute = value.toFixed(2);
  return value > 0 ? `+${absolute}` : absolute;
}

export function formatDirectionLabel(direction: DashboardData["direction"]): string {
  if (direction === "ABOVE") return "above";
  if (direction === "BELOW") return "below";
  return "near";
}

export function buildComparisonSentence(data: DashboardData): string {
  const absoluteDifference = Math.abs(data.differenceFromHeadline).toFixed(2);

  if (data.direction === "ABOVE") {
    return `You are experiencing ${absoluteDifference} percentage points higher inflation than the national average.`;
  }

  if (data.direction === "BELOW") {
    return `You are experiencing ${absoluteDifference} percentage points lower inflation than the national average.`;
  }

  return "Your inflation is close to the national average.";
}

export function buildResultExplanation(data: DashboardData): string {
  if (data.calculationStatus !== "OK") {
    return "INFLORA needs more reliably categorized transactions before it can estimate your personal inflation.";
  }

  const [first, second, third] = data.topDrivers.map((driver) =>
    displayCategoryName(driver.categoryId, driver.categoryName),
  );
  const driverPhrase = [first, second, third].filter(Boolean).join(", ");

  if (!first) {
    return `Your personal inflation is ${data.personalInflation.toFixed(2)}%, compared with India's ${data.headlineInflation.toFixed(2)}% headline CPI.`;
  }

  const directionText =
    data.direction === "ABOVE"
      ? "above"
      : data.direction === "BELOW"
        ? "below"
        : "close to";

  return `Your personal inflation is ${data.personalInflation.toFixed(2)}%, ${directionText} India's ${data.headlineInflation.toFixed(2)}% headline CPI. ${first} is currently the largest upward contributor, followed by ${driverPhrase
    .split(", ")
    .slice(1)
    .join(" and ") || "the rest of your basket"}.`;
}

export function buildBasketInsights(data: DashboardData): Array<{
  label: string;
  category: DashboardData["categories"][number];
  categoryName: string;
  value: string;
}> {
  if (data.categories.length === 0) {
    return [];
  }

  const largestPressureDriver = [...data.topDrivers].sort(
    (a, b) =>
      Math.abs(b.contributionPercentagePoints) - Math.abs(a.contributionPercentagePoints),
  )[0];
  const largestPressureCategory = largestPressureDriver
    ? data.categories.find((category) => category.categoryId === largestPressureDriver.categoryId)
    : undefined;
  const highestCpiCategory = [...data.categories].sort(
    (a, b) => b.cpiInflation - a.cpiInflation,
  )[0];
  const largestSpendCategory = [...data.categories].sort(
    (a, b) => b.spendingAmount - a.spendingAmount,
  )[0];

  return [
    largestPressureCategory
      ? {
          label: "Largest inflation pressure",
          category: largestPressureCategory,
          categoryName: displayCategoryName(
            largestPressureCategory.categoryId,
            largestPressureCategory.categoryName,
          ),
          value: `${formatDifference(largestPressureCategory.contributionPercentagePoints)} pp`,
        }
      : null,
    highestCpiCategory
      ? {
          label: "Highest CPI category in your basket",
          category: highestCpiCategory,
          categoryName: displayCategoryName(
            highestCpiCategory.categoryId,
            highestCpiCategory.categoryName,
          ),
          value: `${highestCpiCategory.cpiInflation.toFixed(2)}%`,
        }
      : null,
    largestSpendCategory
      ? {
          label: "Largest spending category",
          category: largestSpendCategory,
          categoryName: displayCategoryName(
            largestSpendCategory.categoryId,
            largestSpendCategory.categoryName,
          ),
          value: formatInr(largestSpendCategory.spendingAmount),
        }
      : null,
  ].filter((insight): insight is NonNullable<typeof insight> => insight !== null);
}

export function displayCategoryName(categoryId: string, fallback: string): string {
  const names: Record<string, string> = {
    clothing_footwear: "Clothing & Footwear",
    education: "Education",
    food_beverages: "Food & Beverages",
    healthcare: "Healthcare",
    household_goods: "Household Goods",
    housing_utilities: "Housing & Utilities",
    information_communication: "Information & Communication",
    paan_tobacco_intoxicants: "Paan, Tobacco & Intoxicants",
    personal_care_misc: "Personal Care",
    recreation: "Recreation",
    restaurants_accommodation: "Restaurants & Accommodation",
    transport: "Transport",
    uncategorized: "Uncategorized",
  };

  return names[categoryId] ?? fallback;
}

export function formatCategorizationMethod(
  method: DashboardData["transactions"][number]["categorizationMethod"],
): string {
  const labels: Record<typeof method, string> = {
    exact_merchant: "Exact Merchant",
    merchant_alias: "Merchant Alias",
    structured_narration: "Structured Narration",
    description_phrase: "Description Phrase",
    uncategorized: "Uncategorized",
  };

  return labels[method];
}

export function formatExclusionReason(
  reason: DashboardData["transactions"][number]["exclusionReason"],
): string {
  return reason
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
