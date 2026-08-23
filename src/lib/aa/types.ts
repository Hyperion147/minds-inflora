import { z } from "zod";
import type { EngineTransactionInput } from "@/lib/inflation/types";

export const ConsentStatusSchema = z.enum([
  "PENDING",
  "INITIATED",
  "FAILED",
  "ACTIVE",
  "PAUSED",
  "REVOKED",
  "EXPIRED",
  "REJECTED",
]);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const SessionStatusSchema = z.enum([
  "ACTIVE",
  "PENDING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
  "PARTIAL",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export type DataRange = {
  from: string;
  to: string;
};

export type CreateConsentResult = {
  consentId: string;
  consentUrl: string;
  status: ConsentStatus;
};

export type ConsentStatusResult = {
  consentId: string;
  status: ConsentStatus;
  canFetchData: boolean;
  dataRange?: DataRange;
};

export type DataSessionResult = {
  sessionId: string;
  consentId: string;
  status: SessionStatus;
  dataRange: DataRange;
  reused?: boolean;
};

export type FinancialDataAccountStatus = {
  maskedAccNumber?: string;
  linkRefNumber?: string;
  status?: string;
  description?: string;
};

export type FinancialDataFipStatus = {
  fipId: string;
  accounts: FinancialDataAccountStatus[];
};

export type FinancialDataResult = {
  sessionId: string;
  consentId: string;
  status: SessionStatus;
  /** Present when status is COMPLETED or PARTIAL with usable data */
  transactions?: EngineTransactionInput[];
  transactionCount?: number;
  traceId?: string;
  txnId?: string;
  providerMessage?: string;
  fips?: FinancialDataFipStatus[];
  hasUsableAccountData?: boolean;
};

export type SessionListItem = {
  sessionId: string;
  status: string;
  createdAt: string;
};

export type SessionListResult = {
  consentId: string;
  sessions: SessionListItem[];
};

/**
 * @deprecated Prefer EngineTransactionInput for inflation ingestion.
 * Kept for display/legacy AA table views.
 */
export type Transaction = {
  id: string;
  amount: number;
  currency: string;
  type: "CREDIT" | "DEBIT";
  timestamp: string;
  description?: string;
  merchantName?: string;
  accountReference?: string;
  category?: string;
  source?: string;
  raw?: unknown;
};

export class AaError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "AaError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Re-export engine input as the AA → inflation contract */
export type { EngineTransactionInput };
