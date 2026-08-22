import { finiteOrZero, roundRate } from "./calculateSpendingWeights";

/**
 * Simplified hackathon visualization:
 * per100Impact = contributionPercentagePoints
 *
 * Example: 1.25 pp contribution ≈ ₹1.25 per ₹100 of basket impact
 * under the weighted model. This is NOT a claim that any specific
 * merchant bill rises by exactly that rupee amount.
 */
export function calculatePer100Impact(
  contributionPercentagePoints: number,
): number {
  return roundRate(finiteOrZero(contributionPercentagePoints), 6);
}
