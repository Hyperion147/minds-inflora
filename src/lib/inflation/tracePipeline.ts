import { calculateSpendingWeights } from "./calculateSpendingWeights";
import { categorizeTransactions } from "./categorizeTransactions";
import {
  assessEligibility,
  normalizeTransactions,
} from "./normalizeTransactions";
import type {
  AppCategoryId,
  CategoryConfidence,
  CategorizationMethod,
  CpiDataset,
  EngineTransactionInput,
  MerchantCategoryMapping,
} from "./types";
import { UNCATEGORIZED } from "./types";

export type CategoryTraceSample = {
  id: string;
  merchantNormalized: string;
  descriptionSample: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  eligible: boolean;
  exclusionReason: string;
  categoryId: AppCategoryId;
  categoryConfidence: CategoryConfidence;
  categorizationMethod: CategorizationMethod;
  categorizationSource: string | null;
};

export type InflationPipelineDiagnostics = {
  transactionCount: number;
  eligibleCount: number;
  excludedCount: number;
  totalEligibleSpend: number;
  categorizedSpend: number;
  uncategorizedSpend: number;
  uncategorizedPercentage: number;
  mappedCategoryCount: number;
  topCategorySamples: CategoryTraceSample[];
  likelyIssue: "NO_ELIGIBLE_SPEND" | "NO_MAPPED_CATEGORIES" | "OK";
};

export function traceInflationPipeline(input: {
  transactions: EngineTransactionInput[];
  cpi: CpiDataset;
  merchantMapping: MerchantCategoryMapping;
}): InflationPipelineDiagnostics {
  const normalized = normalizeTransactions(input.transactions);
  const withEligibility = assessEligibility(normalized);
  const categorized = categorizeTransactions(
    withEligibility,
    input.merchantMapping,
  );
  const weights = calculateSpendingWeights(categorized, input.cpi);
  const eligibleCount = categorized.filter((txn) => txn.eligible).length;
  const mappedCategoryCount = categorized.filter(
    (txn) => txn.eligible && txn.categoryId !== UNCATEGORIZED,
  ).length;

  return {
    transactionCount: normalized.length,
    eligibleCount,
    excludedCount: normalized.length - eligibleCount,
    totalEligibleSpend: weights.totalEligibleSpend,
    categorizedSpend: weights.categorizedSpend,
    uncategorizedSpend: weights.uncategorizedSpend,
    uncategorizedPercentage: weights.uncategorizedPercentage,
    mappedCategoryCount,
    topCategorySamples: categorized
      .slice(0, 8)
      .map((txn) => ({
        id: maskTraceId(txn.id),
        merchantNormalized: txn.merchantNormalized,
        descriptionSample: sampleText(txn.description),
        amount: txn.amount,
        type: txn.type,
        eligible: txn.eligible,
        exclusionReason: txn.exclusionReason,
        categoryId: txn.categoryId,
        categoryConfidence: txn.categoryConfidence,
        categorizationMethod: txn.categorizationMethod,
        categorizationSource: txn.categorizationSource,
      })),
    likelyIssue:
      eligibleCount === 0
        ? "NO_ELIGIBLE_SPEND"
        : mappedCategoryCount === 0
          ? "NO_MAPPED_CATEGORIES"
          : "OK",
  };
}

function maskTraceId(id: string): string {
  if (id.length <= 8) return "****";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function sampleText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}
