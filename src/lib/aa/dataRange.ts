import type { AppEnv } from "@/lib/env";
import type { DataRange } from "./setu/types";

/** Server-side lookback window for consent + FI session dataRange. */
export function calculateTransactionDataRange(
  lookbackMonths: number,
  now = new Date(),
): DataRange {
  const months = Math.max(1, Math.min(24, Math.floor(lookbackMonths)));
  const to = new Date(now);
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - months);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function getConfiguredDataRange(env: AppEnv): DataRange {
  return calculateTransactionDataRange(env.AA_TRANSACTION_LOOKBACK_MONTHS);
}

export function clampDataRangeToConsent(
  requested: DataRange,
  consent: DataRange,
): DataRange {
  const requestedFrom = new Date(requested.from);
  const requestedTo = new Date(requested.to);
  const consentFrom = new Date(consent.from);
  const consentTo = new Date(consent.to);

  const from = requestedFrom > consentFrom ? requestedFrom : consentFrom;
  const to = requestedTo < consentTo ? requestedTo : consentTo;

  if (from > to) {
    throw new Error("Requested FI dataRange does not overlap consent dataRange.");
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
