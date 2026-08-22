import type {
  ConsentStatusResult,
  CreateConsentResult,
  DataRange,
  DataSessionResult,
  FinancialDataResult,
  SessionListResult,
} from "./types";

/**
 * Provider-agnostic Account Aggregator adapter.
 * Implementations: mock | setu
 */
export interface AccountAggregatorProvider {
  readonly name: "mock" | "setu";

  createConsent(input: {
    redirectUrl: string;
    dataRange: DataRange;
    mobileNumber?: string;
  }): Promise<CreateConsentResult>;

  getConsentStatus(consentId: string): Promise<ConsentStatusResult>;

  createFinancialDataSession(
    consentId: string,
    dataRange: DataRange,
  ): Promise<DataSessionResult>;

  getFinancialData(sessionId: string): Promise<FinancialDataResult>;

  listDataSessions?(consentId: string): Promise<SessionListResult>;

  checkAccountAvailability?(mobileNumber: string): Promise<{
    accounts: Array<{ aa: string; vua: string; status: boolean }>;
  }>;
}
