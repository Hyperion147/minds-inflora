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
