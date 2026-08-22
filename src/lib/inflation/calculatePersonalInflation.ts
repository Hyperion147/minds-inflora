import { finiteOrZero, roundRate } from "./calculateSpendingWeights";
import type { CategorySpending } from "./types";

/**
 * personalInflation = Σ(categoryWeight × categoryInflation)
 * Result is a percentage (e.g. 4.12 means 4.12%).
 */
export function calculatePersonalInflation(
  categories: CategorySpending[],
): number {
  if (categories.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const category of categories) {
    const contribution =
      finiteOrZero(category.spendingWeight) *
      finiteOrZero(category.cpiInflation);
    sum += contribution;
  }

  return roundRate(finiteOrZero(sum), 6);
}
