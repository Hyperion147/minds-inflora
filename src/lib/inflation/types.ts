/**
 * INFLORA inflation engine — pure domain types.
 * No React / Next.js / AA / browser dependencies.
 */

export type TransactionType = "DEBIT" | "CREDIT";

/** Input transaction shape accepted by the engine. */
export type EngineTransactionInput = {
  id: string;
  date: string;
  merchant?: string;
  description?: string;
  amount: number;
  currency: string;
  type: TransactionType;
};

export type NormalizedTransaction = {
  id: string;
  date: string;
  merchantRaw: string;
  merchantNormalized: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
};

export type EligibilityReason =
  | "eligible"
  | "credit"
  | "invalid_amount"
  | "unknown_currency"
  | "income"
  | "refund"
  | "own_account_transfer"
  | "loan_disbursal"
  | "investment"
  | "credit_card_payment"
  | "non_consumption";

export type EligibleTransaction = NormalizedTransaction & {
  eligible: boolean;
  exclusionReason: EligibilityReason;
};

export type AppCategoryId =
  | "food_beverages"
  | "paan_tobacco_intoxicants"
  | "clothing_footwear"
  | "housing_utilities"
  | "household_goods"
  | "healthcare"
  | "transport"
  | "information_communication"
  | "recreation"
  | "education"
  | "restaurants_accommodation"
  | "personal_care_misc"
  | "uncategorized";

export type CategoryConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type CategorizationMethod =
  | "exact_merchant"
  | "merchant_alias"
  | "structured_narration"
  | "description_phrase"
  | "uncategorized";

export type CategorizedTransaction = EligibleTransaction & {
  categoryId: AppCategoryId;
  categoryConfidence: CategoryConfidence;
  categorizationMethod: CategorizationMethod;
  categorizationSource: string | null;
};

/**
 * Official CPI division snapshot for one reference month.
 * Values must come from MoSPI / data pack — never invent them.
 */
export type CpiDivision = {
  code: string;
  name: string;
  /** Combined CPI weight (percent of basket), e.g. 36.753 */
  combinedWeight: number;
  /** YoY inflation rate for the reference month, e.g. 5.24 */
  inflationRate: number;
  appCategory: Exclude<AppCategoryId, "uncategorized">;
  index?: number;
};

export type CpiDataset = {
  /** e.g. "2026-07" */
  referenceMonth: string;
  /** Headline All-India Combined CPI inflation %, e.g. 4.45 */
  headlineInflation: number;
  cpiSeries: string;
  sector: string;
  source?: string;
  sourceUrl?: string;
  divisions: CpiDivision[];
};

/** Synthetic merchant → app category map (hackathon data, not official). */
export type MerchantCategoryMapping = Record<string, Exclude<AppCategoryId, "uncategorized">>;

export type CategorySpending = {
  categoryId: Exclude<AppCategoryId, "uncategorized">;
  categoryName: string;
  cpiCode: string;
  cpiCombinedWeight: number;
  spendingAmount: number;
  /** Share of eligible consumer spend; weights across categories ≈ 1 */
  spendingWeight: number;
  cpiInflation: number;
};

export type CategoryDriver = {
  categoryId: string;
  categoryName: string;
  spendingAmount: number;
  spendingWeight: number;
  /** CPI division inflation % for this category */
  cpiInflation: number;
  /** categoryWeight × categoryInflation (percentage points) */
  contributionPercentagePoints: number;
  /**
   * Simplified hackathon visualization: equals contributionPercentagePoints.
   * A value of 1.25 means ≈ ₹1.25 of weighted price-pressure per ₹100 of basket —
   * not a claim that any specific bill rises by exactly that amount.
   */
  per100Impact: number;
};

export type HeadlineDirection = "ABOVE" | "BELOW" | "NEAR";

export type HeadlineComparison = {
  personalInflation: number;
  headlineInflation: number;
  differenceFromHeadline: number;
  direction: HeadlineDirection;
};

export type InflationCalculationStatus =
  | "OK"
  | "INSUFFICIENT_CATEGORIZATION_COVERAGE";

export type InfloraResult = {
  calculationStatus: InflationCalculationStatus;
  hasSufficientCategorizedSpend: boolean;
  referenceMonth: string;
  totalEligibleSpend: number;
  personalInflation: number;
  headlineInflation: number;
  differenceFromHeadline: number;
  direction: HeadlineDirection;
  categories: CategoryDriver[];
  topDrivers: CategoryDriver[];
  categorizedSpend: number;
  mappedCategoryCount: number;
  uncategorizedSpend: number;
  uncategorizedPercentage: number;
  excludedCount: number;
  eligibleCount: number;
  transactionCount: number;
};

export type InfloraEngineInput = {
  transactions: EngineTransactionInput[];
  cpi: CpiDataset;
  /** Synthetic merchant mappings; defaults to empty (all uncategorized). */
  merchantMapping?: MerchantCategoryMapping;
  /** Absolute difference (pp) treated as NEAR headline. Default 0.05 */
  nearHeadlineTolerance?: number;
  /** Weight-sum floating tolerance. Default 1e-9 */
  weightSumTolerance?: number;
};

export const UNCATEGORIZED = "uncategorized" as const;

export const WEIGHT_SUM_TOLERANCE = 1e-9;
export const NEAR_HEADLINE_TOLERANCE = 0.05;
