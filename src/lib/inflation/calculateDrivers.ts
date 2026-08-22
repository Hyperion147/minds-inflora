import { calculatePer100Impact } from "./calculatePer100Impact";
import { finiteOrZero, roundRate } from "./calculateSpendingWeights";
import type { CategoryDriver, CategorySpending } from "./types";

/**
 * contributionPercentagePoints = categoryWeight × categoryInflation
 * Sorted by absolute contribution descending.
 */
export function calculateDrivers(
  categories: CategorySpending[],
): CategoryDriver[] {
  const drivers = categories.map((category) => {
    const contributionPercentagePoints = roundRate(
      finiteOrZero(category.spendingWeight) *
        finiteOrZero(category.cpiInflation),
      6,
    );

    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      spendingAmount: category.spendingAmount,
      spendingWeight: roundRate(category.spendingWeight, 8),
      cpiInflation: category.cpiInflation,
      contributionPercentagePoints,
      per100Impact: calculatePer100Impact(contributionPercentagePoints),
    };
  });

  drivers.sort(
    (a, b) =>
      Math.abs(b.contributionPercentagePoints) -
      Math.abs(a.contributionPercentagePoints),
  );

  return drivers;
}

export function selectTopDrivers(
  drivers: CategoryDriver[],
  limit = 3,
): CategoryDriver[] {
  return drivers.slice(0, Math.max(0, limit));
}
