import { describe, expect, it } from "vitest";
import {
  calculateDrivers,
  calculateHeadlineComparison,
  calculateInflora,
  calculatePersonalInflation,
  calculatePer100Impact,
  calculateSpendingWeights,
  categorizeTransactions,
  classifyEligibility,
  loadDemoTransactionsCsv,
  loadInfloraEngineData,
  normalizeMerchantName,
  normalizeTransactions,
  resolveMerchantCategory,
  selectTopDrivers,
  traceInflationPipeline,
  type CpiDataset,
  type EngineTransactionInput,
  type MerchantCategoryMapping,
} from "./index";
import { assessEligibility } from "./normalizeTransactions";

const mapping: MerchantCategoryMapping = {
  swiggy: "food_beverages",
  zomato: "food_beverages",
  dmart: "food_beverages",
  uber: "transport",
  "apollo pharmacy": "healthcare",
  pharmacy: "healthcare",
  myntra: "clothing_footwear",
  netflix: "recreation",
  amazon: "household_goods",
};

function miniCpi(): CpiDataset {
  return {
    referenceMonth: "2026-07",
    headlineInflation: 4.45,
    cpiSeries: "CPI 2024=100",
    sector: "Combined",
    divisions: [
      {
        code: "01",
        name: "Food and beverages",
        combinedWeight: 36.753,
        inflationRate: 5.24,
        appCategory: "food_beverages",
      },
      {
        code: "07",
        name: "Transport",
        combinedWeight: 8.796,
        inflationRate: 4.43,
        appCategory: "transport",
      },
      {
        code: "06",
        name: "Health",
        combinedWeight: 6.1,
        inflationRate: 1.34,
        appCategory: "healthcare",
      },
      {
        code: "03",
        name: "Clothing and footwear",
        combinedWeight: 6.383,
        inflationRate: 3.38,
        appCategory: "clothing_footwear",
      },
      {
        code: "09",
        name: "Recreation, sport and culture",
        combinedWeight: 1.516,
        inflationRate: 1.64,
        appCategory: "recreation",
      },
      {
        code: "05",
        name: "Furnishings, household equipment and routine household maintenance",
        combinedWeight: 4.469,
        inflationRate: 2.4,
        appCategory: "household_goods",
      },
    ],
  };
}

describe("merchant normalization", () => {
  it("normalizes casing, punctuation, and corporate suffixes", () => {
    expect(normalizeMerchantName("SWIGGY")).toBe("swiggy");
    expect(normalizeMerchantName("Swiggy")).toBe("swiggy");
    expect(normalizeMerchantName("SWIGGY INDIA")).toBe("swiggy");
    expect(normalizeMerchantName("Swiggy Pvt Ltd")).toBe("swiggy");
  });

  it("resolves variants to the same category", () => {
    expect(resolveMerchantCategory("SWIGGY", mapping)).toBe("food_beverages");
    expect(resolveMerchantCategory("Swiggy India", mapping)).toBe(
      "food_beverages",
    );
    expect(resolveMerchantCategory("Apollo Pharmacy", mapping)).toBe(
      "healthcare",
    );
    expect(resolveMerchantCategory("Unknown Mart", mapping)).toBe(
      "uncategorized",
    );
  });
});

describe("eligibility exclusions", () => {
  it("excludes credits, salary, refunds, transfers, loans, investments, CC bills", () => {
    const cases: Array<[EngineTransactionInput, string]> = [
      [
        {
          id: "1",
          date: "2026-07-01",
          merchant: "Salary",
          amount: 45000,
          currency: "INR",
          type: "CREDIT",
        },
        "credit",
      ],
      [
        {
          id: "2",
          date: "2026-07-01",
          merchant: "Employer Payroll",
          amount: 1000,
          currency: "INR",
          type: "DEBIT",
        },
        "income",
      ],
      [
        {
          id: "3",
          date: "2026-07-01",
          merchant: "Amazon Refund",
          amount: 500,
          currency: "INR",
          type: "DEBIT",
        },
        "refund",
      ],
      [
        {
          id: "4",
          date: "2026-07-01",
          merchant: "Self Transfer",
          amount: 2000,
          currency: "INR",
          type: "DEBIT",
        },
        "own_account_transfer",
      ],
      [
        {
          id: "5",
          date: "2026-07-01",
          merchant: "Loan Disbursal",
          amount: 100000,
          currency: "INR",
          type: "DEBIT",
        },
        "loan_disbursal",
      ],
      [
        {
          id: "6",
          date: "2026-07-01",
          merchant: "Mutual Fund SIP",
          amount: 5000,
          currency: "INR",
          type: "DEBIT",
        },
        "investment",
      ],
      [
        {
          id: "7",
          date: "2026-07-01",
          merchant: "Credit Card Bill Payment",
          amount: 12000,
          currency: "INR",
          type: "DEBIT",
        },
        "credit_card_payment",
      ],
    ];

    for (const [txn, reason] of cases) {
      const [normalized] = normalizeTransactions([txn]);
      expect(classifyEligibility(normalized!)).toBe(reason);
    }
  });

  it("keeps genuine UPI consumption and merchant spend", () => {
    const txn: EngineTransactionInput = {
      id: "upi-1",
      date: "2026-07-01",
      merchant: "UPI Transfer",
      description: "UPI to local kirana",
      amount: 250,
      currency: "INR",
      type: "DEBIT",
    };
    const [normalized] = normalizeTransactions([txn]);
    expect(classifyEligibility(normalized!)).toBe("eligible");
  });

  it("rejects invalid amounts and unknown currencies", () => {
    expect(
      classifyEligibility(
        normalizeTransactions([
          {
            id: "bad-1",
            date: "2026-07-01",
            merchant: "Swiggy",
            amount: -10,
            currency: "INR",
            type: "DEBIT",
          },
        ])[0]!,
      ),
    ).toBe("invalid_amount");

    expect(
      classifyEligibility(
        normalizeTransactions([
          {
            id: "bad-2",
            date: "2026-07-01",
            merchant: "Swiggy",
            amount: 10,
            currency: "USD",
            type: "DEBIT",
          },
        ])[0]!,
      ),
    ).toBe("unknown_currency");
  });
});

describe("basic calculation", () => {
  it("computes weights, personal inflation, drivers, and headline comparison", () => {
    const transactions: EngineTransactionInput[] = [
      {
        id: "a",
        date: "2026-07-01",
        merchant: "Swiggy",
        amount: 600,
        currency: "INR",
        type: "DEBIT",
      },
      {
        id: "b",
        date: "2026-07-02",
        merchant: "Uber",
        amount: 400,
        currency: "INR",
        type: "DEBIT",
      },
      {
        id: "c",
        date: "2026-07-03",
        merchant: "Salary",
        amount: 50000,
        currency: "INR",
        type: "CREDIT",
      },
    ];

    const result = calculateInflora({
      transactions,
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.totalEligibleSpend).toBe(1000);
    expect(result.eligibleCount).toBe(2);
    expect(result.excludedCount).toBe(1);

    const food = result.categories.find((c) => c.categoryId === "food_beverages");
    const transport = result.categories.find((c) => c.categoryId === "transport");
    expect(food?.spendingWeight).toBeCloseTo(0.6, 8);
    expect(transport?.spendingWeight).toBeCloseTo(0.4, 8);

    // 0.6*5.24 + 0.4*4.43 = 3.144 + 1.772 = 4.916
    expect(result.personalInflation).toBeCloseTo(4.916, 5);
    expect(result.headlineInflation).toBe(4.45);
    expect(result.differenceFromHeadline).toBeCloseTo(0.466, 5);
    expect(result.direction).toBe("ABOVE");

    expect(result.topDrivers[0]?.categoryId).toBe("food_beverages");
    expect(result.topDrivers[0]?.contributionPercentagePoints).toBeCloseTo(
      3.144,
      5,
    );
    expect(result.topDrivers[0]?.per100Impact).toBeCloseTo(3.144, 5);
  });
});

describe("category weights", () => {
  it("weights sum with uncategorized fraction to ~1", () => {
    const txns = assessEligibility(
      normalizeTransactions([
        {
          id: "1",
          date: "2026-07-01",
          merchant: "Swiggy",
          amount: 70,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "2",
          date: "2026-07-01",
          merchant: "Mystery Shop",
          amount: 30,
          currency: "INR",
          type: "DEBIT",
        },
      ]),
    );
    const categorized = categorizeTransactions(txns, mapping);
    const weights = calculateSpendingWeights(categorized, miniCpi());

    expect(weights.totalEligibleSpend).toBe(100);
    expect(weights.uncategorizedSpend).toBe(30);
    expect(weights.categories[0]?.spendingWeight).toBeCloseTo(0.7, 8);
    expect(weights.weightsSumToOne).toBe(true);
  });
});

describe("weighted inflation & drivers", () => {
  it("sums weight × inflation and sorts drivers by abs contribution", () => {
    const categories = [
      {
        categoryId: "food_beverages" as const,
        categoryName: "Food and beverages",
        cpiCode: "01",
        cpiCombinedWeight: 36.753,
        spendingAmount: 500,
        spendingWeight: 0.5,
        cpiInflation: 5.24,
      },
      {
        categoryId: "transport" as const,
        categoryName: "Transport",
        cpiCode: "07",
        cpiCombinedWeight: 8.796,
        spendingAmount: 500,
        spendingWeight: 0.5,
        cpiInflation: 4.43,
      },
    ];

    expect(calculatePersonalInflation(categories)).toBeCloseTo(4.835, 5);

    const drivers = calculateDrivers(categories);
    expect(drivers[0]?.categoryId).toBe("food_beverages");
    expect(selectTopDrivers(drivers, 1)).toHaveLength(1);
    expect(calculatePer100Impact(1.25)).toBe(1.25);
  });
});

describe("headline comparison", () => {
  it("classifies ABOVE / BELOW / NEAR", () => {
    expect(calculateHeadlineComparison(5, 4.45).direction).toBe("ABOVE");
    expect(calculateHeadlineComparison(4, 4.45).direction).toBe("BELOW");
    expect(calculateHeadlineComparison(4.47, 4.45).direction).toBe("NEAR");
  });
});

describe("uncategorized & exclusions", () => {
  it("tracks uncategorized spend and excludes non-consumption", () => {
    const result = calculateInflora({
      transactions: [
        {
          id: "1",
          date: "2026-07-01",
          merchant: "Random Kirana",
          amount: 100,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "2",
          date: "2026-07-01",
          merchant: "Salary",
          amount: 10,
          currency: "INR",
          type: "CREDIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.personalInflation).toBe(0);
    expect(result.uncategorizedSpend).toBe(100);
    expect(result.uncategorizedPercentage).toBe(100);
    expect(result.categories).toHaveLength(0);
    expect(result.excludedCount).toBe(1);
  });

  it("diagnoses Setu-like eligible spend with no mapped category", () => {
    const transactions: EngineTransactionInput[] = [
      {
        id: "setu-sandbox-1",
        date: "2026-07-01T10:00:00+05:30",
        description: "UPI/P2M/000001/MERCHANT PAYMENT",
        amount: 2239042,
        currency: "INR",
        type: "DEBIT",
      },
    ];

    const result = calculateInflora({
      transactions,
      cpi: miniCpi(),
      merchantMapping: mapping,
    });
    const diagnostics = traceInflationPipeline({
      transactions,
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.totalEligibleSpend).toBe(2239042);
    expect(result.personalInflation).toBe(0);
    expect(result.topDrivers).toHaveLength(0);
    expect(result.uncategorizedSpend).toBe(2239042);
    expect(diagnostics.likelyIssue).toBe("NO_MAPPED_CATEGORIES");
    expect(diagnostics.mappedCategoryCount).toBe(0);
    expect(diagnostics.topCategorySamples[0]).toMatchObject({
      merchantNormalized: "upi p2m 000001 merchant payment",
      eligible: true,
      exclusionReason: "eligible",
      categoryId: "uncategorized",
    });
  });
});

describe("edge cases", () => {
  it("handles zero transactions and zero eligible spend without NaN", () => {
    const empty = calculateInflora({
      transactions: [],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });
    expect(empty.personalInflation).toBe(0);
    expect(empty.totalEligibleSpend).toBe(0);
    expect(Number.isFinite(empty.differenceFromHeadline)).toBe(true);

    const creditsOnly = calculateInflora({
      transactions: [
        {
          id: "c1",
          date: "2026-07-01",
          merchant: "Salary",
          amount: 1,
          currency: "INR",
          type: "CREDIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });
    expect(creditsOnly.personalInflation).toBe(0);
    expect(creditsOnly.eligibleCount).toBe(0);
  });

  it("deduplicates by id and tolerates missing merchants", () => {
    const result = calculateInflora({
      transactions: [
        {
          id: "dup",
          date: "2026-07-01",
          merchant: "Swiggy",
          amount: 100,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "dup",
          date: "2026-07-01",
          merchant: "Swiggy",
          amount: 100,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "no-merch",
          date: "2026-07-01",
          amount: 50,
          currency: "INR",
          type: "DEBIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.transactionCount).toBe(2);
    expect(result.totalEligibleSpend).toBe(150);
    expect(result.uncategorizedSpend).toBe(50);
  });

  it("never returns Infinity for huge amounts", () => {
    const result = calculateInflora({
      transactions: [
        {
          id: "big",
          date: "2026-07-01",
          merchant: "Swiggy",
          amount: 1e12,
          currency: "INR",
          type: "DEBIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });
    expect(Number.isFinite(result.personalInflation)).toBe(true);
    expect(result.personalInflation).toBeCloseTo(5.24, 5);
  });
});

describe("demo data pack integration", () => {
  it("loads official CPI and computes demo_transactions.csv result", () => {
    const { cpi, merchantMapping } = loadInfloraEngineData();
    expect(cpi.headlineInflation).toBe(4.45);
    expect(cpi.divisions.length).toBeGreaterThan(0);

    const transactions = loadDemoTransactionsCsv();
    expect(transactions.length).toBe(15);

    const result = calculateInflora({
      transactions,
      cpi,
      merchantMapping,
    });

    // Salary credit excluded
    expect(result.excludedCount).toBe(1);
    expect(result.totalEligibleSpend).toBe(13759);
    expect(result.personalInflation).toBeGreaterThan(0);
    expect(result.uncategorizedSpend).toBe(0);
    expect(result.topDrivers).toHaveLength(3);
    expect(Number.isFinite(result.personalInflation)).toBe(true);

    // Mapped category weights + uncategorized fraction ≈ 1
    const weightSum = result.categories.reduce(
      (s, c) => s + c.spendingWeight,
      0,
    );
    expect(weightSum).toBeCloseTo(1, 6);
  });
});
