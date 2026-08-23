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
  loadDeterministicFixtureTransactionsCsv,
  loadDemoTransactionsCsv,
  loadInfloraEngineData,
  normalizeMerchantName,
  normalizeTransactions,
  resolveMerchantCategory,
  selectTopDrivers,
  traceInflationPipeline,
  UNCATEGORIZED,
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

  it("adds categorization metadata for exact merchant matches", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "exact-1",
            date: "2026-07-01",
            merchant: "Swiggy",
            amount: 200,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]).toMatchObject({
      categoryId: "food_beverages",
      categoryConfidence: "HIGH",
      categorizationMethod: "exact_merchant",
      categorizationSource: "swiggy",
    });
  });

  it("matches deterministic merchant aliases safely", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "alias-1",
            date: "2026-07-01",
            merchant: "Amazon Online",
            amount: 400,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]).toMatchObject({
      categoryId: "household_goods",
      categoryConfidence: "HIGH",
      categorizationMethod: "merchant_alias",
      categorizationSource: "amazon",
    });
  });

  it("matches dotted merchant aliases safely", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "alias-dot-1",
            date: "2026-07-01",
            merchant: "Swiggy.in",
            amount: 320,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]).toMatchObject({
      categoryId: "food_beverages",
      categoryConfidence: "HIGH",
      categorizationMethod: "merchant_alias",
      categorizationSource: "swiggy",
    });
  });

  it("categorizes real CSV merchants with exact matching", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "csv-amazon",
            date: "2026-07-01",
            merchant: "Amazon",
            amount: 900,
            currency: "INR",
            type: "DEBIT",
          },
          {
            id: "csv-swiggy",
            date: "2026-07-01",
            merchant: "Swiggy",
            amount: 250,
            currency: "INR",
            type: "DEBIT",
          },
          {
            id: "csv-uber",
            date: "2026-07-01",
            merchant: "Uber",
            amount: 180,
            currency: "INR",
            type: "DEBIT",
          },
          {
            id: "csv-apollo",
            date: "2026-07-01",
            merchant: "Apollo Pharmacy",
            amount: 520,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized.map((txn) => txn.categoryId)).toEqual([
      "household_goods",
      "food_beverages",
      "transport",
      "healthcare",
    ]);
    expect(categorized.every((txn) => txn.categorizationMethod === "exact_merchant")).toBe(true);
    expect(categorized.every((txn) => txn.categoryConfidence === "HIGH")).toBe(true);
  });

  it("supports alias matching for real CSV merchants without categorizing names", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "alias-amazon",
            date: "2026-07-01",
            merchant: "Amazon Online",
            amount: 400,
            currency: "INR",
            type: "DEBIT",
          },
          {
            id: "alias-unknown",
            date: "2026-07-01",
            merchant: "Unknown Merchant",
            amount: 400,
            currency: "INR",
            type: "DEBIT",
          },
          {
            id: "alias-person-name",
            date: "2026-07-01",
            description: "CARD/DE/596392116311/Trisha Basu/APYP/38259647",
            amount: 400,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]).toMatchObject({
      categoryId: "household_goods",
      categorizationMethod: "merchant_alias",
      categoryConfidence: "HIGH",
      categorizationSource: "amazon",
    });
    expect(categorized[1]?.categoryId).toBe(UNCATEGORIZED);
    expect(categorized[2]?.categoryId).toBe(UNCATEGORIZED);
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

  it("excludes Setu sandbox cash and fund-transfer debit rails from consumer spending", () => {
    const cases: Array<[EngineTransactionInput, string]> = [
      [
        {
          id: "setu-atm-de",
          date: "2026-08-20T10:00:00+05:30",
          description: "ATM/DE/77506833375/Lagan Shere/DSWV/38636371",
          amount: 1500,
          currency: "INR",
          type: "DEBIT",
        },
        "non_consumption",
      ],
      [
        {
          id: "setu-cash-de",
          date: "2026-08-20T10:00:00+05:30",
          description: "CASH/DE/887147222217/Gokul Manda/UNIF/8818442",
          amount: 2000,
          currency: "INR",
          type: "DEBIT",
        },
        "non_consumption",
      ],
      [
        {
          id: "setu-ft-de",
          date: "2026-08-20T10:00:00+05:30",
          description: "FT/DE/887147222217/Someone Else/UNIF/8818442",
          amount: 2000,
          currency: "INR",
          type: "DEBIT",
        },
        "non_consumption",
      ],
    ];

    for (const [txn, reason] of cases) {
      const [normalized] = normalizeTransactions([txn]);
      expect(classifyEligibility(normalized!)).toBe(reason);
    }
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

    expect(result.calculationStatus).toBe("OK");
    expect(result.hasSufficientCategorizedSpend).toBe(true);
    expect(result.totalEligibleSpend).toBe(1000);
    expect(result.categorizedSpend).toBe(1000);
    expect(result.mappedCategoryCount).toBe(2);
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

    expect(result.calculationStatus).toBe("INSUFFICIENT_CATEGORIZATION_COVERAGE");
    expect(result.hasSufficientCategorizedSpend).toBe(false);
    expect(result.personalInflation).toBe(0);
    expect(result.categorizedSpend).toBe(0);
    expect(result.mappedCategoryCount).toBe(0);
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
    expect(result.calculationStatus).toBe("INSUFFICIENT_CATEGORIZATION_COVERAGE");
    expect(result.hasSufficientCategorizedSpend).toBe(false);
    expect(result.personalInflation).toBe(0);
    expect(result.topDrivers).toHaveLength(0);
    expect(result.categorizedSpend).toBe(0);
    expect(result.mappedCategoryCount).toBe(0);
    expect(result.uncategorizedSpend).toBe(2239042);
    expect(diagnostics.likelyIssue).toBe("NO_MAPPED_CATEGORIES");
    expect(diagnostics.mappedCategoryCount).toBe(0);
    expect(diagnostics.topCategorySamples[0]).toMatchObject({
      merchantNormalized: "upi p2m 000001 merchant payment",
      eligible: true,
      exclusionReason: "eligible",
      categoryId: "uncategorized",
      categoryConfidence: "NONE",
      categorizationMethod: "uncategorized",
      categorizationSource: null,
    });
  });

  it("categorizes Setu-style card descriptions by embedded merchant tokens, not people's names", () => {
    const transactions: EngineTransactionInput[] = [
      {
        id: "setu-card-amazon",
        date: "2026-07-01T10:00:00+05:30",
        description: "CARD/DE/596392116311/Some Person/Amazon/38259647",
        amount: 1200,
        currency: "INR",
        type: "DEBIT",
      },
      {
        id: "setu-card-person-only",
        date: "2026-07-01T10:05:00+05:30",
        description: "CARD/DE/596392116312/Dhanush Bedi/APYP/38259648",
        amount: 800,
        currency: "INR",
        type: "DEBIT",
      },
    ];

    const categorized = categorizeTransactions(
      assessEligibility(normalizeTransactions(transactions)),
      mapping,
    );

    expect(categorized[0]?.eligible).toBe(true);
    expect(categorized[0]).toMatchObject({
      categoryId: "household_goods",
      categoryConfidence: "MEDIUM",
      categorizationMethod: "structured_narration",
      categorizationSource: "amazon",
    });
    expect(categorized[1]?.eligible).toBe(true);
    expect(categorized[1]).toMatchObject({
      categoryId: "uncategorized",
      categoryConfidence: "NONE",
      categorizationMethod: "uncategorized",
      categorizationSource: null,
    });
  });

  it("does not categorize arbitrary personal-name narration without a known merchant key", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "name-only-1",
            date: "2026-07-01T10:05:00+05:30",
            description: "CARD/DE/596392116312/Dhanush Bedi/APYP/38259648",
            amount: 800,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]?.categoryId).toBe(UNCATEGORIZED);
    expect(categorized[0]?.categorizationMethod).toBe("uncategorized");
    expect(categorized[0]?.categoryConfidence).toBe("NONE");
  });

  it("retains conservative description phrase matching", () => {
    const categorized = categorizeTransactions(
      assessEligibility(
        normalizeTransactions([
          {
            id: "phrase-1",
            date: "2026-07-01T10:05:00+05:30",
            description: "UPI/DE/596392116312/Paid to Apollo Pharmacy/38259648",
            amount: 800,
            currency: "INR",
            type: "DEBIT",
          },
        ]),
      ),
      mapping,
    );

    expect(categorized[0]).toMatchObject({
      categoryId: "healthcare",
      categoryConfidence: "LOW",
      categorizationMethod: "description_phrase",
      categorizationSource: "upi de 596392116312 paid to apollo pharmacy 38259648",
    });
  });

  it("reduces false eligible uncategorized spend for Setu sandbox cash/transfer formats", () => {
    const result = calculateInflora({
      transactions: [
        {
          id: "cash-1",
          date: "2026-08-20T10:00:00+05:30",
          description: "CASH/DE/887147222217/Gokul Manda/UNIF/8818442",
          amount: 2000,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "card-1",
          date: "2026-08-20T10:05:00+05:30",
          description: "CARD/DE/596392116311/Some Person/Amazon/38259647",
          amount: 1200,
          currency: "INR",
          type: "DEBIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.eligibleCount).toBe(1);
    expect(result.excludedCount).toBe(1);
    expect(result.totalEligibleSpend).toBe(1200);
    expect(result.uncategorizedSpend).toBe(0);
  });
});

describe("edge cases", () => {
  it("handles zero transactions and zero eligible spend without NaN", () => {
    const empty = calculateInflora({
      transactions: [],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });
    expect(empty.calculationStatus).toBe("OK");
    expect(empty.hasSufficientCategorizedSpend).toBe(true);
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
    expect(creditsOnly.calculationStatus).toBe("OK");
    expect(creditsOnly.hasSufficientCategorizedSpend).toBe(true);
    expect(creditsOnly.personalInflation).toBe(0);
    expect(creditsOnly.eligibleCount).toBe(0);
  });

  it("keeps a valid calculation when categorization is partial but categorized spend exists", () => {
    const result = calculateInflora({
      transactions: [
        {
          id: "mapped",
          date: "2026-07-01",
          merchant: "Swiggy",
          amount: 700,
          currency: "INR",
          type: "DEBIT",
        },
        {
          id: "uncategorized",
          date: "2026-07-02",
          merchant: "Mystery Merchant",
          amount: 300,
          currency: "INR",
          type: "DEBIT",
        },
      ],
      cpi: miniCpi(),
      merchantMapping: mapping,
    });

    expect(result.calculationStatus).toBe("OK");
    expect(result.hasSufficientCategorizedSpend).toBe(true);
    expect(result.totalEligibleSpend).toBe(1000);
    expect(result.categorizedSpend).toBe(700);
    expect(result.mappedCategoryCount).toBe(1);
    expect(result.personalInflation).toBeCloseTo(3.668, 5);
    expect(result.uncategorizedSpend).toBe(300);
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
    expect(result.calculationStatus).toBe("OK");
    expect(result.hasSufficientCategorizedSpend).toBe(true);
    expect(result.excludedCount).toBe(1);
    expect(result.totalEligibleSpend).toBe(13759);
    expect(result.categorizedSpend).toBeGreaterThan(0);
    expect(result.mappedCategoryCount).toBeGreaterThan(0);
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

  it("loads deterministic_fixture_transactions.csv through the production pipeline", () => {
    const { cpi, merchantMapping } = loadInfloraEngineData();
    const transactions = loadDeterministicFixtureTransactionsCsv();

    const normalized = normalizeTransactions(transactions);
    const eligible = assessEligibility(normalized);
    const categorized = categorizeTransactions(eligible, merchantMapping);
    const weights = calculateSpendingWeights(categorized, cpi);
    const result = calculateInflora({
      transactions,
      cpi,
      merchantMapping,
    });

    const categorizedTransactions = categorized.filter(
      (txn) => txn.eligible && txn.categoryId !== UNCATEGORIZED,
    );
    const eligibleTransactions = categorized.filter((txn) => txn.eligible);
    const categorizationCoverage =
      eligibleTransactions.length > 0
        ? (categorizedTransactions.length / eligibleTransactions.length) * 100
        : 0;

    process.stdout.write(
      `Deterministic fixture summary ${JSON.stringify({
        transactionCount: result.transactionCount,
        eligibleCount: result.eligibleCount,
        categorizedTransactionCount: categorizedTransactions.length,
        categorizedSpend: result.categorizedSpend,
        mappedCategoryCount: result.mappedCategoryCount,
        categoriesLength: result.categories.length,
        topDriversLength: result.topDrivers.length,
        personalInflation: result.personalInflation,
        weightsCategoryCount: weights.categories.length,
        totalEligibleSpend: weights.totalEligibleSpend,
        categorizationCoverage,
      })}\n`,
    );

    expect(transactions.length).toBe(120);
    expect(result.eligibleCount).toBeGreaterThanOrEqual(70);
    expect(result.eligibleCount).toBeLessThanOrEqual(100);
    expect(result.excludedCount).toBeGreaterThan(0);
    expect(categorizedTransactions.length).toBeGreaterThan(0);
    expect(categorizedTransactions.length).toBeLessThan(result.eligibleCount);
    expect(categorizationCoverage).toBeGreaterThanOrEqual(85);
    expect(categorizationCoverage).toBeLessThanOrEqual(95);
    expect(result.categorizedSpend).toBeGreaterThan(0);
    expect(result.mappedCategoryCount).toBeGreaterThan(0);
    expect(result.calculationStatus).toBe("OK");
    expect(result.hasSufficientCategorizedSpend).toBe(true);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.topDrivers.length).toBeGreaterThan(0);
  });
});
