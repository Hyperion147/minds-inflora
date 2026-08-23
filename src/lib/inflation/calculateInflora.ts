import { calculateDrivers, selectTopDrivers } from "./calculateDrivers";
import { calculateHeadlineComparison } from "./calculateHeadlineComparison";
import { calculatePersonalInflation } from "./calculatePersonalInflation";
import { calculateSpendingWeights } from "./calculateSpendingWeights";
import { categorizeTransactions } from "./categorizeTransactions";
import {
  assessEligibility,
  normalizeTransactions,
} from "./normalizeTransactions";
import type {
  InfloraEngineInput,
  InfloraResult,
  MerchantCategoryMapping,
} from "./types";
import { NEAR_HEADLINE_TOLERANCE } from "./types";
import { UNCATEGORIZED } from "./types";

/**
 * Run the full INFLORA personalized inflation pipeline.
 * Pure function: transactions + CPI dataset → deterministic result.
 */
export function calculateInflora(input: InfloraEngineInput): InfloraResult {
  const mapping: MerchantCategoryMapping = input.merchantMapping ?? {};
  const nearTolerance =
    input.nearHeadlineTolerance ?? NEAR_HEADLINE_TOLERANCE;
  const weightTolerance = input.weightSumTolerance;

  const normalized = normalizeTransactions(input.transactions);
  const withEligibility = assessEligibility(normalized);
  const categorized = categorizeTransactions(withEligibility, mapping);

  const weights = calculateSpendingWeights(
    categorized,
    input.cpi,
    weightTolerance,
  );

  const personalInflation = calculatePersonalInflation(weights.categories);
  const drivers = calculateDrivers(weights.categories);
  const topDrivers = selectTopDrivers(drivers, 3);
  const headline = calculateHeadlineComparison(
    personalInflation,
    input.cpi.headlineInflation,
    nearTolerance,
  );

  const eligibleCount = withEligibility.filter((t) => t.eligible).length;
  const excludedCount = withEligibility.length - eligibleCount;
  const mappedCategoryCount = categorized.filter(
    (txn) => txn.eligible && txn.categoryId !== UNCATEGORIZED,
  ).length;
  const hasSufficientCategorizedSpend =
    eligibleCount === 0 || weights.categorizedSpend > 0;
  const calculationStatus = hasSufficientCategorizedSpend
    ? "OK"
    : "INSUFFICIENT_CATEGORIZATION_COVERAGE";

  return {
    calculationStatus,
    hasSufficientCategorizedSpend,
    referenceMonth: input.cpi.referenceMonth,
    totalEligibleSpend: weights.totalEligibleSpend,
    personalInflation: headline.personalInflation,
    headlineInflation: headline.headlineInflation,
    differenceFromHeadline: headline.differenceFromHeadline,
    direction: headline.direction,
    categories: drivers,
    topDrivers,
    categorizedSpend: weights.categorizedSpend,
    mappedCategoryCount,
    uncategorizedSpend: weights.uncategorizedSpend,
    uncategorizedPercentage: weights.uncategorizedPercentage,
    excludedCount,
    eligibleCount,
    transactionCount: normalized.length,
  };
}
