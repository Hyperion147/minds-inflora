import type {
  AppCategoryId,
  CategorizationMethod,
  CategoryConfidence,
  CategoryDriver,
  EligibilityReason,
  HeadlineDirection,
  InflationCalculationStatus,
} from "@/lib/inflation";

export type DashboardDataSource = "showcase" | "live";
export type DashboardMode = DashboardDataSource;
export type DashboardState = "ready" | "processing" | "failed";

export type DashboardCategory = {
  categoryId: Exclude<AppCategoryId, "uncategorized">;
  categoryName: string;
  spendingAmount: number;
  spendingShare: number;
  cpiInflation: number;
  contributionPercentagePoints: number;
};

export type DashboardTransaction = {
  id: string;
  date: string;
  displayDate: string;
  label: string;
  categoryLabel: string;
  categoryId: AppCategoryId;
  categoryConfidence: CategoryConfidence;
  categorizationMethod: CategorizationMethod;
  categorizationSource: string | null;
  exclusionReason: EligibilityReason;
  type: "DEBIT" | "CREDIT";
  amount: number;
  eligible: boolean;
  includedInPersonalInflation: boolean;
};

export type DashboardAccountLine = {
  fipId: string;
  maskedAccount: string;
  status: string;
  description?: string;
};

export type DashboardInsight = {
  id: string;
  title: string;
  body: string;
};

export type DashboardData = {
  mode: DashboardMode;
  state: DashboardState;
  title: string;
  sourceLabel: string;
  sourcePill: string;
  overallStatus: string;
  overallStatusTone: "success" | "warning" | "destructive" | "neutral";
  calculationStatus: InflationCalculationStatus;
  personalInflation: number;
  headlineInflation: number;
  differenceFromHeadline: number;
  direction: HeadlineDirection;
  referenceMonth: string;
  summaryNarrative: string;
  insufficiencyMessage: string | null;
  eligibleSpend: number;
  categorizedSpend: number;
  uncategorizedSpend: number;
  categorizationCoverage: number;
  transactionCount: number;
  eligibleCount: number;
  excludedCount: number;
  mappedCategoryCount: number;
  categories: DashboardCategory[];
  topDrivers: CategoryDriver[];
  transactions: DashboardTransaction[];
  insights: DashboardInsight[];
  connectedAccounts: number;
  providerLabel: string;
  aggregatorLabel: string;
  dataRangeLabel: string;
  lastUpdatedLabel: string;
  sessionStatus?: string;
  consentStatus?: string;
  accountLines: DashboardAccountLine[];
  traceId?: string;
  transactionId?: string;
  errorMessage?: string;
};
