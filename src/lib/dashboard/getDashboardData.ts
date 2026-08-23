import "server-only";

import {
  assessEligibility,
  calculateInflora,
  categorizeTransactions,
  loadDeterministicFixtureTransactionsCsv,
  loadInfloraEngineData,
  normalizeTransactions,
  type AppCategoryId,
  type CategoryDriver,
  type EngineTransactionInput,
} from "@/lib/inflation";
import { formatDisplayDate, formatInr } from "@/lib/utils";
import { getAaService } from "@/lib/aa/service";
import { getAppEnv } from "@/lib/env";
import type { FinancialDataAccountStatus, FinancialDataResult } from "@/lib/aa/types";
import type {
  DashboardAccountLine,
  DashboardCategory,
  DashboardData,
  DashboardDataSource,
  DashboardInsight,
} from "./types";

type GetDashboardDataOptions = {
  mode?: string;
  sessionId?: string;
  consentId?: string;
};

export async function getDashboardData({
  mode,
  sessionId,
  consentId,
}: GetDashboardDataOptions): Promise<DashboardData> {
  const source = normalizeDashboardDataSource(mode);

  if (source === "live") {
    return getLiveDashboardData({ sessionId, consentId });
  }

  return getShowcaseDashboardData();
}

export function normalizeDashboardDataSource(mode?: string): DashboardDataSource {
  const normalized = mode?.trim().toLowerCase();
  if (normalized === "live") {
    return "live";
  }
  return "showcase";
}

async function getShowcaseDashboardData(): Promise<DashboardData> {
  const { cpi, merchantMapping } = loadInfloraEngineData();
  const transactions = loadDeterministicFixtureTransactionsCsv();
  const normalized = normalizeTransactions(transactions);
  const eligible = assessEligibility(normalized);
  const categorized = categorizeTransactions(eligible, merchantMapping);
  const result = calculateInflora({
    transactions,
    cpi,
    merchantMapping,
  });

  const categories = mapCategories(result.categories, result.totalEligibleSpend);
  const transactionRows = buildTransactionRows(categorized);

  return {
    mode: "showcase",
    state: "ready",
    title: "INFLORA Dashboard",
    sourceLabel: "Deterministic fixture dataset",
    sourcePill: "Showcase data",
    overallStatus: "READY",
    overallStatusTone: "success",
    calculationStatus: result.calculationStatus,
    personalInflation: result.personalInflation,
    headlineInflation: result.headlineInflation,
    differenceFromHeadline: result.differenceFromHeadline,
    direction: result.direction,
    referenceMonth: result.referenceMonth,
    summaryNarrative: buildSummaryNarrative(result.direction, result.differenceFromHeadline),
    insufficiencyMessage: getInsufficiencyMessage(result.calculationStatus),
    eligibleSpend: result.totalEligibleSpend,
    categorizedSpend: result.categorizedSpend,
    uncategorizedSpend: result.uncategorizedSpend,
    categorizationCoverage: calculateCoverage(result.categorizedSpend, result.totalEligibleSpend),
    transactionCount: result.transactionCount,
    eligibleCount: result.eligibleCount,
    excludedCount: result.excludedCount,
    mappedCategoryCount: result.mappedCategoryCount,
    categories,
    topDrivers: result.topDrivers,
    transactions: transactionRows,
    insights: buildInsights({
      result,
      categories,
      totalFetched: transactions.length,
    }),
    connectedAccounts: 1,
    providerLabel: "INFLORA Fixture",
    aggregatorLabel: "Showcase mode",
    dataRangeLabel: formatDateRange(transactions),
    lastUpdatedLabel: formatLastUpdated(new Date().toISOString()),
    sessionStatus: "COMPLETED",
    consentStatus: "ACTIVE",
    accountLines: [
      {
        fipId: "demo-fixture",
        maskedAccount: "DEMO •••• 0001",
        status: "READY",
        description: "Deterministic showcase dataset",
      },
    ],
  };
}

async function getLiveDashboardData({
  sessionId,
  consentId,
}: {
  sessionId?: string;
  consentId?: string;
}): Promise<DashboardData> {
  const service = getAaService();
  const env = getAppEnv();
  const resolvedSessionId = sessionId ?? (await resolveLatestSessionId(consentId));

  if (!resolvedSessionId) {
    return buildUnavailableLiveDashboard(
      "Connect your live accounts to retrieve financial data, or return to Showcase mode for the deterministic demo.",
    );
  }

  const session = await service.getTransactions(resolvedSessionId);
  if (session.status === "PENDING" || session.status === "ACTIVE") {
    return buildLiveProcessingDashboard(session, env.AA_PROVIDER === "setu" ? "SETU" : "Mock");
  }

  const transactions = session.transactions ?? [];
  if (transactions.length === 0 && !hasReadyAccount(session)) {
    return buildLiveFailedDashboard(
      session,
      session.providerMessage ?? "Unable to load your financial data.",
      env.AA_PROVIDER === "setu" ? "SETU" : "Mock",
    );
  }

  const { cpi, merchantMapping } = loadInfloraEngineData();
  const normalized = normalizeTransactions(transactions);
  const eligible = assessEligibility(normalized);
  const categorized = categorizeTransactions(eligible, merchantMapping);
  const result = calculateInflora({
    transactions,
    cpi,
    merchantMapping,
  });
  const categories = mapCategories(result.categories, result.totalEligibleSpend);

  return {
    mode: "live",
    state: session.status === "FAILED" || session.status === "EXPIRED" ? "failed" : "ready",
    title: "INFLORA Dashboard",
    sourceLabel: "Live AA data",
    sourcePill: "Live data",
    overallStatus: session.status,
    overallStatusTone: mapStatusTone(session.status),
    calculationStatus: result.calculationStatus,
    personalInflation: result.personalInflation,
    headlineInflation: result.headlineInflation,
    differenceFromHeadline: result.differenceFromHeadline,
    direction: result.direction,
    referenceMonth: result.referenceMonth,
    summaryNarrative: buildSummaryNarrative(result.direction, result.differenceFromHeadline),
    insufficiencyMessage: getInsufficiencyMessage(result.calculationStatus),
    eligibleSpend: result.totalEligibleSpend,
    categorizedSpend: result.categorizedSpend,
    uncategorizedSpend: result.uncategorizedSpend,
    categorizationCoverage: calculateCoverage(result.categorizedSpend, result.totalEligibleSpend),
    transactionCount: result.transactionCount,
    eligibleCount: result.eligibleCount,
    excludedCount: result.excludedCount,
    mappedCategoryCount: result.mappedCategoryCount,
    categories,
    topDrivers: result.topDrivers,
    transactions: buildTransactionRows(categorized),
    insights: buildInsights({
      result,
      categories,
      totalFetched: transactions.length,
    }),
    connectedAccounts: countAccounts(session),
    providerLabel: env.AA_PROVIDER === "setu" ? "SETU" : "Mock provider",
    aggregatorLabel: "Account Aggregator",
    dataRangeLabel: formatDateRange(transactions),
    lastUpdatedLabel: formatLastUpdated(new Date().toISOString()),
    sessionStatus: session.status,
    consentStatus: "ACTIVE",
    accountLines: flattenAccountLines(session.fips ?? []),
    traceId: session.traceId,
    transactionId: session.txnId,
    errorMessage:
      session.status === "FAILED" || session.status === "EXPIRED"
        ? session.providerMessage ?? "Provider marked this session as unavailable."
        : undefined,
  };
}

function buildUnavailableLiveDashboard(message: string): DashboardData {
  return {
    mode: "live",
    state: "failed",
    title: "INFLORA Dashboard",
    sourceLabel: "Live AA data",
    sourcePill: "Live data",
    overallStatus: "FAILED",
    overallStatusTone: "destructive",
    calculationStatus: "INSUFFICIENT_CATEGORIZATION_COVERAGE",
    personalInflation: 0,
    headlineInflation: 0,
    differenceFromHeadline: 0,
    direction: "NEAR",
    referenceMonth: "Unavailable",
    summaryNarrative: "Unable to load your financial data.",
    insufficiencyMessage: message,
    eligibleSpend: 0,
    categorizedSpend: 0,
    uncategorizedSpend: 0,
    categorizationCoverage: 0,
    transactionCount: 0,
    eligibleCount: 0,
    excludedCount: 0,
    mappedCategoryCount: 0,
    categories: [],
    topDrivers: [],
    transactions: [],
    insights: [{ id: "live-error", title: "Financial data unavailable", body: message }],
    connectedAccounts: 0,
    providerLabel: "SETU",
    aggregatorLabel: "Account Aggregator",
    dataRangeLabel: "Unavailable",
    lastUpdatedLabel: formatLastUpdated(new Date().toISOString()),
    accountLines: [],
    errorMessage: message,
  };
}

function buildLiveProcessingDashboard(
  session: FinancialDataResult,
  providerLabel: string,
): DashboardData {
  return {
    mode: "live",
    state: "processing",
    title: "INFLORA Dashboard",
    sourceLabel: "Live AA data",
    sourcePill: "Live data",
    overallStatus: session.status,
    overallStatusTone: "warning",
    calculationStatus: "INSUFFICIENT_CATEGORIZATION_COVERAGE",
    personalInflation: 0,
    headlineInflation: 0,
    differenceFromHeadline: 0,
    direction: "NEAR",
    referenceMonth: "Processing",
    summaryNarrative: "Fetching your financial data...",
    insufficiencyMessage:
      "INFLORA is waiting for your provider to finish preparing financial data.",
    eligibleSpend: 0,
    categorizedSpend: 0,
    uncategorizedSpend: 0,
    categorizationCoverage: 0,
    transactionCount: session.transactionCount ?? 0,
    eligibleCount: 0,
    excludedCount: 0,
    mappedCategoryCount: 0,
    categories: [],
    topDrivers: [],
    transactions: [],
    insights: [
      {
        id: "processing",
        title: "Financial data is still processing",
        body: "SETU is still preparing your FI data. INFLORA will calculate your inflation once transactions are available.",
      },
    ],
    connectedAccounts: countAccounts(session),
    providerLabel,
    aggregatorLabel: "Account Aggregator",
    dataRangeLabel: "Preparing data",
    lastUpdatedLabel: formatLastUpdated(new Date().toISOString()),
    sessionStatus: session.status,
    accountLines: flattenAccountLines(session.fips ?? []),
    traceId: session.traceId,
    transactionId: session.txnId,
  };
}

function buildLiveFailedDashboard(
  session: FinancialDataResult,
  message: string,
  providerLabel: string,
): DashboardData {
  return {
    mode: "live",
    state: "failed",
    title: "INFLORA Dashboard",
    sourceLabel: "Live AA data",
    sourcePill: "Live data",
    overallStatus: session.status,
    overallStatusTone: "destructive",
    calculationStatus: "INSUFFICIENT_CATEGORIZATION_COVERAGE",
    personalInflation: 0,
    headlineInflation: 0,
    differenceFromHeadline: 0,
    direction: "NEAR",
    referenceMonth: "Unavailable",
    summaryNarrative: "Unable to load your financial data.",
    insufficiencyMessage: message,
    eligibleSpend: 0,
    categorizedSpend: 0,
    uncategorizedSpend: 0,
    categorizationCoverage: 0,
    transactionCount: session.transactionCount ?? 0,
    eligibleCount: 0,
    excludedCount: 0,
    mappedCategoryCount: 0,
    categories: [],
    topDrivers: [],
    transactions: [],
    insights: [
      {
        id: "session-failed",
        title: "Provider returned a failed FI session",
        body: message,
      },
    ],
    connectedAccounts: countAccounts(session),
    providerLabel,
    aggregatorLabel: "Account Aggregator",
    dataRangeLabel: "Unavailable",
    lastUpdatedLabel: formatLastUpdated(new Date().toISOString()),
    sessionStatus: session.status,
    accountLines: flattenAccountLines(session.fips ?? []),
    traceId: session.traceId,
    transactionId: session.txnId,
    errorMessage: message,
  };
}

async function resolveLatestSessionId(consentId?: string): Promise<string | undefined> {
  if (!consentId) {
    return undefined;
  }

  const service = getAaService();
  const sessions = await service.listSessions(consentId);
  const latest = [...sessions.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return latest?.sessionId;
}

function buildInsights({
  result,
  categories,
  totalFetched,
}: {
  result: ReturnType<typeof calculateInflora>;
  categories: DashboardCategory[];
  totalFetched: number;
}): DashboardInsight[] {
  if (result.calculationStatus !== "OK") {
    return [
      {
        id: "insufficient-categorization",
        title: "More categorization is needed",
        body: "More merchant categorization is needed before INFLORA can estimate your personal inflation reliably.",
      },
      {
        id: "eligible-spend",
        title: "Eligible spending was identified",
        body: `${formatInr(result.totalEligibleSpend)} of fetched transactions was eligible for inflation analysis.`,
      },
      {
        id: "coverage",
        title: "Coverage is currently low",
        body: `${result.eligibleCount} of ${totalFetched} fetched transactions were eligible, but categorized spend remained too low for a reliable estimate.`,
      },
    ];
  }

  const topCategory = categories[0];
  return [
    {
      id: "vs-headline",
      title: "Personal inflation versus headline CPI",
      body: `Your personal inflation is ${formatSigned(result.differenceFromHeadline)} percentage points ${result.direction === "ABOVE" ? "above" : result.direction === "BELOW" ? "below" : "near"} headline CPI.`,
    },
    topCategory
      ? {
          id: "largest-category",
          title: "Largest spending category",
          body: `${topCategory.categoryName} is your largest spending category at ${formatInr(topCategory.spendingAmount)}.`,
        }
      : {
          id: "largest-category",
          title: "Spending mix available",
          body: "Your eligible transactions were successfully mapped into CPI-linked spending categories.",
        },
    {
        id: "categorized-spend",
        title: "Categorized spending",
        body: `${formatInr(result.categorizedSpend)} of eligible spend was categorized for inflation analysis.`,
    },
  ];
}

function mapCategories(
  categories: CategoryDriver[],
  totalEligibleSpend: number,
): DashboardCategory[] {
  return [...categories]
    .sort((a, b) => b.spendingAmount - a.spendingAmount)
    .map((category) => ({
      categoryId: category.categoryId as Exclude<AppCategoryId, "uncategorized">,
      categoryName: category.categoryName,
      spendingAmount: category.spendingAmount,
      spendingShare: totalEligibleSpend > 0 ? category.spendingAmount / totalEligibleSpend : 0,
      cpiInflation: category.cpiInflation,
      contributionPercentagePoints: category.contributionPercentagePoints,
    }));
}

function buildTransactionRows(
  transactions: ReturnType<typeof categorizeTransactions>,
): DashboardData["transactions"] {
  return [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((txn) => ({
      id: txn.id,
      date: txn.date,
      displayDate: formatDisplayDate(txn.date),
      label: txn.description || txn.merchantRaw || "Transaction",
      categoryLabel: formatCategoryLabel(txn.categoryId),
      categoryId: txn.categoryId,
      categoryConfidence: txn.categoryConfidence,
      categorizationMethod: txn.categorizationMethod,
      categorizationSource: txn.categorizationSource,
      exclusionReason: txn.exclusionReason,
      type: txn.type,
      amount: txn.amount,
      eligible: txn.eligible,
      includedInPersonalInflation: txn.eligible && txn.categoryId !== "uncategorized",
    }));
}

function flattenAccountLines(
  fips: Array<{
    fipId?: string;
    accounts?: FinancialDataAccountStatus[];
  }>,
): DashboardAccountLine[] {
  return fips.flatMap((fip) =>
    (fip.accounts ?? []).map((account) => ({
      fipId: fip.fipId ?? "Unknown FIP",
      maskedAccount: account.maskedAccNumber ?? "Masked account unavailable",
      status: account.status ?? "UNKNOWN",
      description: account.description,
    })),
  );
}

function countAccounts(session: FinancialDataResult): number {
  return (session.fips ?? []).reduce(
    (
      count: number,
      fip: NonNullable<FinancialDataResult["fips"]>[number],
    ) => count + (fip.accounts?.length ?? 0),
    0,
  );
}

function hasReadyAccount(session: FinancialDataResult): boolean {
  return (session.fips ?? []).some((fip) =>
    (fip.accounts ?? []).some((account: FinancialDataAccountStatus) => {
      const status = account.status?.toUpperCase();
      return status === "READY" || status === "DELIVERED";
    }),
  );
}

function calculateCoverage(categorizedSpend: number, totalEligibleSpend: number): number {
  if (totalEligibleSpend <= 0) return 0;
  return (categorizedSpend / totalEligibleSpend) * 100;
}

function buildSummaryNarrative(direction: DashboardData["direction"], difference: number): string {
  if (direction === "ABOVE") {
    return `Your household spending is rising faster than the headline inflation basket by ${formatSigned(difference)} percentage points.`;
  }
  if (direction === "BELOW") {
    return `Your household spending is rising slower than the headline inflation basket by ${formatSigned(Math.abs(difference))} percentage points.`;
  }
  return "Your household spending is tracking close to the headline inflation basket.";
}

function getInsufficiencyMessage(status: DashboardData["calculationStatus"]): string | null {
  if (status !== "INSUFFICIENT_CATEGORIZATION_COVERAGE") {
    return null;
  }

  return "Not enough categorized spending was available to calculate a reliable personal inflation estimate.";
}

function formatDateRange(transactions: EngineTransactionInput[]): string {
  if (transactions.length === 0) {
    return "Unavailable";
  }

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (!start || !end) {
    return "Unavailable";
  }

  return `${formatDisplayDate(start.date)} - ${formatDisplayDate(end.date)}`;
}

function formatLastUpdated(timestamp: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatCategoryLabel(categoryId: AppCategoryId): string {
  if (categoryId === "uncategorized") {
    return "Uncategorized";
  }

  return categoryId
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSigned(value: number): string {
  const rounded = value.toFixed(2);
  return value > 0 ? `+${rounded}` : rounded;
}

function mapStatusTone(
  status: string,
): DashboardData["overallStatusTone"] {
  const normalized = status.toUpperCase();
  if (normalized === "READY" || normalized === "ACTIVE" || normalized === "COMPLETED") {
    return "success";
  }
  if (normalized === "PENDING" || normalized === "PARTIAL") {
    return "warning";
  }
  if (normalized === "FAILED" || normalized === "TIMEOUT" || normalized === "EXPIRED") {
    return "destructive";
  }
  return "neutral";
}
