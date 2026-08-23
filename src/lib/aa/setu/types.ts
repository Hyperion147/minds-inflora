/**
 * Types derived from data/api-1.json (Setu AA Gateway v2).
 * Do not invent fields beyond this OpenAPI schema.
 */

export type SetuConsentStatus =
  | "PENDING"
  | "INITIATED"
  | "FAILED"
  | "ACTIVE"
  | "PAUSED"
  | "REVOKED"
  | "EXPIRED"
  | "REJECTED";

export type SetuSessionStatus =
  | "ACTIVE"
  | "PENDING"
  | "COMPLETED"
  | "EXPIRED"
  | "FAILED"
  | "PARTIAL";

/** TokenAPIRequest — POST /users/login */
export type TokenAPIRequest = {
  clientID: string;
  grant_type: "client_credentials";
  secret: string;
};

/** TokenAPIResponse */
export type TokenAPIResponse = {
  access_token: string;
  refresh_token?: string;
};

export type DataRange = {
  from: string;
  to: string;
};

/** ConsentRequestPurpose — purpose code 102 for personal finance */
export type ConsentRequestPurpose = {
  code: "101" | "102" | "103" | "104" | "105";
  text: string;
  category: { type: string };
  refUri: string;
};

/**
 * CreateConsentRequestV2
 * Required by OpenAPI: dataRange, vua
 * MVP extras: DEPOSIT + TRANSACTIONS + ONETIME + purpose 102
 */
export type CreateConsentRequestV2 = {
  vua: string;
  dataRange: DataRange;
  consentTypes?: Array<"PROFILE" | "SUMMARY" | "TRANSACTIONS">;
  fiTypes?: Array<"DEPOSIT" | string>;
  fetchType?: "ONETIME" | "PERIODIC";
  consentMode?: "VIEW" | "STORE" | "QUERY" | "STREAM";
  purpose?: ConsentRequestPurpose;
  redirectUrl?: string;
  dataLife?: { unit: "MONTH" | "YEAR" | "DAY" | "INF"; value: number };
  consentDuration?: { unit: "MONTH" | "YEAR" | "DAY"; value: number };
  frequency?: {
    unit: "HOUR" | "DAY" | "MONTH" | "YEAR" | "INF";
    value: number;
  };
  context?: Array<{ key: string; value: string }>;
};

/** ConsentResponseV2 */
export type ConsentResponseV2 = {
  id: string;
  url: string;
  status: SetuConsentStatus;
  redirectUrl?: string;
  accountsLinked?: unknown[];
  detail?: {
    dataRange?: DataRange;
    [key: string]: unknown;
  };
};

/** AccountAvailabilityRequest — POST /v2/account-availability */
export type AccountAvailabilityRequest = {
  mobileNumber: string;
};

/** AccountAvailabilityResponse */
export type AccountAvailabilityResponse = {
  accounts: Array<{
    aa: string;
    vua: string;
    status: boolean;
  }>;
};

/** CreateFIDataFetchRequestV2 — required: consentId, dataRange, format */
export type CreateFIDataFetchRequestV2 = {
  consentId: string;
  dataRange: DataRange;
  format: "json" | "xml";
};

/** DepositJSONAccountTransactionsTransaction */
export type SetuDepositTransaction = {
  amount?: string;
  currentBalance?: string;
  mode?: string;
  narration?: string;
  reference?: string;
  transactionTimestamp?: string;
  txnId?: string;
  type?: string;
  valueDate?: string;
};

export type SetuDepositAccount = {
  linkedAccRef?: string;
  maskedAccNumber?: string;
  type?: string;
  version?: string;
  summary?: { currency?: string };
  transactions?: {
    startDate?: string;
    endDate?: string;
    transaction?: SetuDepositTransaction[] | null;
  };
};

/** DepositJSON */
export type DepositJSON = {
  account?: SetuDepositAccount;
  type?: string;
};

export type FIFetchAccountItem = {
  maskedAccNumber?: string;
  linkRefNumber?: string;
  FIstatus?: string;
  status?: string;
  description?: string;
  data?: DepositJSON | Record<string, unknown>;
};

export type FIFetchFipItem = {
  fipID: string;
  accounts: FIFetchAccountItem[];
};

/** FIDataFetchResponseV2 */
export type FIDataFetchResponseV2 = {
  id: string;
  consentId: string;
  status: SetuSessionStatus;
  format: "json" | "xml";
  dataRange: DataRange;
  fips: FIFetchFipItem[] | null;
  traceId?: string;
  txnid?: string;
  timestamp?: string;
  ver?: string;
};

export type DataSessionsListResponse = {
  consentId: string;
  dataSessions: Array<{
    sessionId: string;
    status: string;
    created_at: string;
  }>;
  traceId: string;
};

export type SetuErrorBody = {
  errorCode?: string;
  errorMsg?: string;
  traceId?: string;
  txnid?: string;
  timestamp?: string;
  ver?: string;
  message?: string;
};
