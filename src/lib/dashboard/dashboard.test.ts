import { describe, expect, it, vi } from "vitest";
import {
  calculateInflora,
  loadDeterministicFixtureTransactionsCsv,
  loadInfloraEngineData,
} from "@/lib/inflation";
import {
  getDashboardData,
  normalizeDashboardDataSource,
} from "./getDashboardData";

vi.mock("server-only", () => ({}));

describe("dashboard data source selection", () => {
  it("normalizes showcase and legacy demo modes without changing live", () => {
    expect(normalizeDashboardDataSource("showcase")).toBe("showcase");
    expect(normalizeDashboardDataSource("demo")).toBe("showcase");
    expect(normalizeDashboardDataSource(undefined)).toBe("showcase");
    expect(normalizeDashboardDataSource("live")).toBe("live");
  });

  it("loads showcase data from the deterministic fixture through the production pipeline", async () => {
    const { cpi, merchantMapping } = loadInfloraEngineData();
    const transactions = loadDeterministicFixtureTransactionsCsv();
    const result = calculateInflora({ transactions, cpi, merchantMapping });
    const dashboard = await getDashboardData({ mode: "showcase" });

    expect(dashboard.mode).toBe("showcase");
    expect(dashboard.sourcePill).toBe("Showcase data");
    expect(dashboard.transactionCount).toBe(transactions.length);
    expect(dashboard.transactionCount).toBeGreaterThan(0);
    expect(dashboard.eligibleCount).toBeGreaterThan(0);
    expect(dashboard.categorizedSpend).toBeGreaterThan(0);
    expect(dashboard.mappedCategoryCount).toBeGreaterThan(0);
    expect(dashboard.calculationStatus).toBe("OK");

    expect(dashboard.personalInflation).toBe(result.personalInflation);
    expect(dashboard.headlineInflation).toBe(result.headlineInflation);
    expect(dashboard.differenceFromHeadline).toBe(result.differenceFromHeadline);
    expect(dashboard.personalInflation.toFixed(2)).toBe("4.27");
    expect(dashboard.headlineInflation.toFixed(2)).toBe("4.45");
    expect(dashboard.differenceFromHeadline.toFixed(2)).toBe("-0.18");
    expect(dashboard.direction).toBe("BELOW");
    expect(dashboard.topDrivers).toEqual(result.topDrivers);
    expect(dashboard.topDrivers[0]?.categoryId).toBe(result.topDrivers[0]?.categoryId);
    expect(dashboard.categories.find((category) => category.categoryId === "personal_care_misc"))
      .toMatchObject({
        spendingAmount: 9980,
        cpiInflation: 14.77,
      });
  });

  it("exposes transaction categorization metadata for categorized and uncategorized rows", async () => {
    const dashboard = await getDashboardData({ mode: "showcase" });
    const swiggy = dashboard.transactions.find((transaction) => transaction.label === "Swiggy");
    const localKirana = dashboard.transactions.find(
      (transaction) => transaction.label === "Local Kirana",
    );

    expect(swiggy).toMatchObject({
      categoryId: "food_beverages",
      categoryConfidence: "HIGH",
      categorizationMethod: "exact_merchant",
      categorizationSource: "swiggy",
      eligible: true,
      includedInPersonalInflation: true,
    });

    expect(localKirana).toMatchObject({
      categoryId: "uncategorized",
      categoryConfidence: "NONE",
      categorizationMethod: "uncategorized",
      categorizationSource: null,
      eligible: true,
      includedInPersonalInflation: false,
    });
  });
});
