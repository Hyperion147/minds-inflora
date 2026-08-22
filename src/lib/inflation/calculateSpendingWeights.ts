import type {
  AppCategoryId,
  CategorizedTransaction,
  CategorySpending,
  CpiDataset,
  CpiDivision,
} from "./types";
import { UNCATEGORIZED, WEIGHT_SUM_TOLERANCE } from "./types";

export type SpendingWeightResult = {
  totalEligibleSpend: number;
  categorizedSpend: number;
  uncategorizedSpend: number;
  uncategorizedPercentage: number;
  categories: CategorySpending[];
  /** True when Σ weights is within tolerance of 1 (or both zero). */
  weightsSumToOne: boolean;
};

/**
 * categoryWeight = categorySpend / totalEligibleConsumerSpend
 * Uncategorized spend is tracked separately and excluded from CPI-weighted inflation.
 */
export function calculateSpendingWeights(
  transactions: CategorizedTransaction[],
  cpi: CpiDataset,
  weightSumTolerance = WEIGHT_SUM_TOLERANCE,
): SpendingWeightResult {
  const divisionByCategory = indexDivisionsByAppCategory(cpi);

  let totalEligibleSpend = 0;
  let uncategorizedSpend = 0;
  const spendByCategory = new Map<
    Exclude<AppCategoryId, "uncategorized">,
    number
  >();

  for (const txn of transactions) {
    if (!txn.eligible) continue;

    const amount = finiteAmount(txn.amount);
    totalEligibleSpend += amount;

    if (txn.categoryId === UNCATEGORIZED) {
      uncategorizedSpend += amount;
      continue;
    }

    const categoryId = txn.categoryId;

    // Only include categories that exist in the official CPI dataset
    if (!divisionByCategory.has(categoryId)) {
      uncategorizedSpend += amount;
      continue;
    }

    spendByCategory.set(
      categoryId,
      (spendByCategory.get(categoryId) ?? 0) + amount,
    );
  }

  const categorizedSpend = totalEligibleSpend - uncategorizedSpend;
  // Spec: categoryWeight = categorySpend / totalEligibleConsumerSpend
  // Uncategorized has no CPI rate → 0 contribution; weight share still counted in denominator.
  const weightBase = totalEligibleSpend > 0 ? totalEligibleSpend : 0;

  const categories: CategorySpending[] = [];

  for (const [categoryId, spendingAmount] of spendByCategory.entries()) {
    const division = divisionByCategory.get(categoryId);
    if (!division) continue;

    const spendingWeight =
      weightBase > 0 ? spendingAmount / weightBase : 0;

    categories.push({
      categoryId,
      categoryName: division.name,
      cpiCode: division.code,
      cpiCombinedWeight: division.combinedWeight,
      spendingAmount: roundMoney(spendingAmount),
      spendingWeight: finiteOrZero(spendingWeight),
      cpiInflation: division.inflationRate,
    });
  }

  categories.sort((a, b) => b.spendingAmount - a.spendingAmount);

  const mappedWeightSum = categories.reduce((s, c) => s + c.spendingWeight, 0);
  const uncategorizedFraction =
    weightBase > 0 ? uncategorizedSpend / weightBase : 0;
  const weightsSumToOne =
    categories.length === 0 && uncategorizedSpend === 0
      ? true
      : Math.abs(mappedWeightSum + uncategorizedFraction - 1) <=
        weightSumTolerance;

  const uncategorizedPercentage =
    totalEligibleSpend > 0
      ? finiteOrZero((uncategorizedSpend / totalEligibleSpend) * 100)
      : 0;

  return {
    totalEligibleSpend: roundMoney(totalEligibleSpend),
    categorizedSpend: roundMoney(categorizedSpend),
    uncategorizedSpend: roundMoney(uncategorizedSpend),
    uncategorizedPercentage: roundRate(uncategorizedPercentage),
    categories,
    weightsSumToOne,
  };
}

export function indexDivisionsByAppCategory(
  cpi: CpiDataset,
): Map<Exclude<AppCategoryId, "uncategorized">, CpiDivision> {
  const map = new Map<Exclude<AppCategoryId, "uncategorized">, CpiDivision>();
  for (const division of cpi.divisions) {
    map.set(division.appCategory, division);
  }
  return map;
}

function finiteAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function roundMoney(value: number): number {
  return Math.round(finiteOrZero(value) * 100) / 100;
}

export function roundRate(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(finiteOrZero(value) * factor) / factor;
}
