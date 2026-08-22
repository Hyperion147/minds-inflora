import type { SetuEnv } from "@/lib/env";
import type { AccountAggregatorProvider } from "../provider";
import { normalizeSetuFiDataToEngineTransactions } from "../normalize";
import type {
  ConsentStatusResult,
  CreateConsentResult,
  DataRange,
  DataSessionResult,
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

    if (status === "PENDING" || status === "ACTIVE") {
      return {
        sessionId: response.id,
        consentId: response.consentId,
        status,
      };
    }

    if (status === "FAILED" || status === "EXPIRED") {
      throw new AaError(
        "FI_SESSION_FAILED",
        `Financial information session ${status.toLowerCase()}.`,
        400,
      );
    }

    // COMPLETED or PARTIAL — normalize DEPOSIT transactions
    const transactions = normalizeSetuFiDataToEngineTransactions(response);
    return {
      sessionId: response.id,
      consentId: response.consentId,
      status,
      transactions,
      transactionCount: transactions.length,
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
