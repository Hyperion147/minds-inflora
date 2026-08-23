/**
 * INFLORA personalized inflation engine.
 *
 * Pure TypeScript domain module — independent of React, Next.js UI,
 * browser APIs, Supabase, and Account Aggregator clients.
 *
 * Pipeline:
 *   normalized transactions
 *     → eligibility filter (consumer spend only)
 *     → merchant categorization (synthetic map)
 *     → spending weights
 *     → personal inflation = Σ(weight × CPI division inflation)
 *     → drivers / headline comparison / per-₹100 impact
 *
 * Official CPI values are injected via CpiDataset (from data pack).
 * Do not hardcode MoSPI numbers in calculation logic.
 */

export type {
  AppCategoryId,
  CategoryConfidence,
  CategorizedTransaction,
  CategorizationMethod,
  CategoryDriver,
  CategorySpending,
  CpiDataset,
  CpiDivision,
  EligibleTransaction,
  EligibilityReason,
  EngineTransactionInput,
  HeadlineComparison,
  HeadlineDirection,
  InflationCalculationStatus,
  InfloraEngineInput,
  InfloraResult,
  MerchantCategoryMapping,
  NormalizedTransaction,
  TransactionType,
} from "./types";

export {
  NEAR_HEADLINE_TOLERANCE,
  UNCATEGORIZED,
  WEIGHT_SUM_TOLERANCE,
} from "./types";

export {
  assessEligibility,
  classifyEligibility,
  normalizeMerchantName,
  normalizeTransactions,
} from "./normalizeTransactions";

export {
  categorizeTransactions,
  resolveMerchantCategory,
} from "./categorizeTransactions";

export {
  calculateSpendingWeights,
  finiteOrZero,
  indexDivisionsByAppCategory,
  roundMoney,
  roundRate,
} from "./calculateSpendingWeights";

export { calculatePersonalInflation } from "./calculatePersonalInflation";
export { calculateDrivers, selectTopDrivers } from "./calculateDrivers";
export {
  calculateHeadlineComparison,
  classifyDirection,
} from "./calculateHeadlineComparison";
export { calculatePer100Impact } from "./calculatePer100Impact";
export { calculateInflora } from "./calculateInflora";
export { traceInflationPipeline } from "./tracePipeline";
export type {
  CategoryTraceSample,
  InflationPipelineDiagnostics,
} from "./tracePipeline";
export {
  cpiDatasetFromOfficial,
  loadDeterministicFixtureTransactionsCsv,
  loadDemoTransactionsCsv,
  loadTransactionsCsv,
  loadInfloraEngineData,
} from "./loadDataset";
