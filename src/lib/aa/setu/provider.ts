import type { SetuEnv } from "@/lib/env";
import type { AccountAggregatorProvider } from "../provider";
import {
  hasUsableFiAccountData,
  normalizeSetuFiDataToEngineTransactions,
} from "../normalize";
import type {
  ConsentStatusResult,
  CreateConsentResult,
  DataRange,
  DataSessionResult,
  FinancialDataFipStatus,
  FinancialDataResult,
  SessionListResult,
} from "../types";
import { AaError } from "../types";
import { parseCustomerMobileNumber } from "../mobile";
import { createSetuClient, type SetuClient } from "./client";
import {
  checkAccountAvailability,
  consentAllowsDataFetch,
  createSetuConsent,
  getSetuConsent,
} from "./consent";
import type { AccountAvailabilityResponse } from "./types";
import {
  createSetuFiSession,
  getSetuFiSession,
  listSetuDataSessions,
} from "./sessions";
import type { ConsentStatus, SessionStatus } from "../types";

export class SetuAaProvider implements AccountAggregatorProvider {
  readonly name = "setu" as const;
  private readonly client: SetuClient;

  constructor(private readonly env: SetuEnv) {
    this.client = createSetuClient(env);
  }

  async createConsent(input: {
    redirectUrl: string;
    dataRange: DataRange;
    mobileNumber?: string;
  }): Promise<CreateConsentResult> {
    const vua = parseCustomerMobileNumber(input.mobileNumber);

    const response = await createSetuConsent(this.client, {
      vua,
      dataRange: input.dataRange,
      redirectUrl: input.redirectUrl,
    });

    if (!response?.id || !response.url) {
      throw new AaError(
        "SETU_CONSENT_INVALID_RESPONSE",
        "Setu did not return a consent URL.",
        502,
      );
    }

    return {
      consentId: response.id,
      consentUrl: response.url,
      status: mapConsentStatus(response.status),
    };
  }

  async getConsentStatus(consentId: string): Promise<ConsentStatusResult> {
    const response = await getSetuConsent(this.client, consentId, true);
    const status = mapConsentStatus(response.status);
    return {
      consentId: response.id,
      status,
      canFetchData: consentAllowsDataFetch(status),
      dataRange: response.detail?.dataRange,
    };
  }

  async createFinancialDataSession(
    consentId: string,
    dataRange: DataRange,
  ): Promise<DataSessionResult> {
    const response = await createSetuFiSession(
      this.client,
      consentId,
      dataRange,
    );
    return {
      sessionId: response.id,
      consentId: response.consentId,
      status: mapSessionStatus(response.status),
      dataRange: response.dataRange,
    };
  }

  async getFinancialData(sessionId: string): Promise<FinancialDataResult> {
    const response = await getSetuFiSession(this.client, sessionId);
    const status = mapSessionStatus(response.status);
    const fips = mapFipStatuses(response);
    const providerMessage = buildProviderMessage(status, fips, response.traceId);
    const hasUsableAccountData = hasAnyUsableAccountData(response);

    if (status === "PENDING" || status === "ACTIVE") {
      return {
        sessionId: response.id,
        consentId: response.consentId,
        status,
        traceId: response.traceId,
        txnId: response.txnid,
        providerMessage,
        fips,
        hasUsableAccountData,
      };
    }

    // COMPLETED or PARTIAL — normalize DEPOSIT transactions.
    // FAILED/EXPIRED are also returned so the route/UI can surface the real provider state.
    const transactions = normalizeSetuFiDataToEngineTransactions(response);
    return {
      sessionId: response.id,
      consentId: response.consentId,
      status,
      transactions,
      transactionCount: transactions.length,
      traceId: response.traceId,
      txnId: response.txnid,
      providerMessage,
      fips,
      hasUsableAccountData,
    };
  }

  async checkAccountAvailability(
    mobileNumber: string,
  ): Promise<AccountAvailabilityResponse> {
    return checkAccountAvailability(this.client, mobileNumber);
  }

  async listDataSessions(consentId: string): Promise<SessionListResult> {
    const response = await listSetuDataSessions(this.client, consentId);
    return {
      consentId: response.consentId,
      sessions: response.dataSessions.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        createdAt: s.created_at,
      })),
    };
  }
}

function mapConsentStatus(status: string): ConsentStatus {
  const allowed: ConsentStatus[] = [
    "PENDING",
    "INITIATED",
    "FAILED",
    "ACTIVE",
    "PAUSED",
    "REVOKED",
    "EXPIRED",
    "REJECTED",
  ];
  const upper = status.toUpperCase() as ConsentStatus;
  if (allowed.includes(upper)) return upper;
  return "FAILED";
}

function mapSessionStatus(status: string): SessionStatus {
  const allowed: SessionStatus[] = [
    "ACTIVE",
    "PENDING",
    "COMPLETED",
    "EXPIRED",
    "FAILED",
    "PARTIAL",
  ];
  const upper = status.toUpperCase() as SessionStatus;
  if (allowed.includes(upper)) return upper;
  return "FAILED";
}

function mapFipStatuses(response: {
  fips: Array<{
    fipID: string;
    accounts: Array<{
      maskedAccNumber?: string;
      linkRefNumber?: string;
      FIstatus?: string;
      status?: string;
      description?: string;
    }>;
  }> | null;
}): FinancialDataFipStatus[] {
  return (response.fips ?? []).map((fip) => ({
    fipId: fip.fipID,
    accounts: (fip.accounts ?? []).map((account) => ({
      maskedAccNumber: account.maskedAccNumber,
      linkRefNumber: account.linkRefNumber,
      status: account.FIstatus ?? account.status,
      description: account.description,
    })),
  }));
}

function buildProviderMessage(
  status: SessionStatus,
  fips: FinancialDataFipStatus[],
  traceId?: string,
): string | undefined {
  const accountStates = fips.flatMap((fip) =>
    fip.accounts.map((account) => {
      const parts = [
        fip.fipId,
        account.maskedAccNumber,
        account.status,
        account.description,
      ].filter(Boolean);
      return parts.join(" / ");
    }),
  );

  const details = accountStates.length > 0 ? ` Account statuses: ${accountStates.join("; ")}.` : "";
  const trace = traceId ? ` Trace ID: ${traceId}.` : "";

  if (status === "FAILED") {
    return `Setu sandbox marked this FI session as FAILED.${details}${trace}`.trim();
  }

  if (status === "EXPIRED") {
    return `Setu sandbox marked this FI session as EXPIRED.${details}${trace}`.trim();
  }

  if (status === "PENDING" || status === "ACTIVE") {
    return `Setu sandbox is still processing this FI session.${details}${trace}`.trim();
  }

  if (status === "PARTIAL") {
    return `Setu sandbox returned PARTIAL FI data.${details}${trace}`.trim();
  }

  if (status === "COMPLETED") {
    return `Setu sandbox returned COMPLETED FI data.${trace}`.trim();
  }

  return undefined;
}

function hasAnyUsableAccountData(response: {
  fips: Array<{
    accounts: Array<{
      FIstatus?: string;
      status?: string;
      data?: Record<string, unknown>;
    }>;
  }> | null;
}): boolean {
  return (response.fips ?? []).some((fip) =>
    (fip.accounts ?? []).some((account) => {
      if (!hasUsableFiAccountData(account)) {
        return false;
      }

      return Boolean(account.data);
    }),
  );
}
