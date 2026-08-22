import { finiteOrZero, roundRate } from "./calculateSpendingWeights";
import type { HeadlineComparison, HeadlineDirection } from "./types";
import { NEAR_HEADLINE_TOLERANCE } from "./types";

/**
 * Compare personal inflation to official headline CPI (e.g. 4.45%).
 * difference = personalInflation - headlineCPI
 */
export function calculateHeadlineComparison(
  personalInflation: number,
  headlineInflation: number,
  nearTolerance = NEAR_HEADLINE_TOLERANCE,
): HeadlineComparison {
  const personal = finiteOrZero(personalInflation);
  const headline = finiteOrZero(headlineInflation);
  const differenceFromHeadline = roundRate(personal - headline, 6);
  const direction = classifyDirection(differenceFromHeadline, nearTolerance);

  return {
    personalInflation: roundRate(personal, 6),
    headlineInflation: roundRate(headline, 6),
    differenceFromHeadline,
    direction,
  };
}

export function classifyDirection(
  differenceFromHeadline: number,
  nearTolerance = NEAR_HEADLINE_TOLERANCE,
): HeadlineDirection {
  const diff = finiteOrZero(differenceFromHeadline);
  if (Math.abs(diff) <= nearTolerance) {
    return "NEAR";
  }
  return diff > 0 ? "ABOVE" : "BELOW";
}
