import { getAppEnv, getRedirectUri, requireSetuEnv, type AppEnv } from "@/lib/env";
import { getConfiguredDataRange } from "./dataRange";
import type { AccountAggregatorProvider } from "./provider";
import { MockAaProvider } from "./mock/provider";
import { SetuAaProvider } from "./setu/provider";
import { maskId, maskMobileNumber } from "./normalize";
import { parseCustomerMobileNumber } from "./mobile";
import type {
  ConsentStatusResult,
  CreateConsentResult,
  DataSessionResult,
  FinancialDataResult,
  SessionListResult,
  SessionListItem,
  SessionStatus,
} from "./types";
import { AaError } from "./types";

export function createAaProvider(
  env: AppEnv = getAppEnv(),
): AccountAggregatorProvider {
  if (env.AA_PROVIDER === "setu") {
    return new SetuAaProvider(requireSetuEnv(env));
  }
  return new MockAaProvider(env);
}

export class AaService {
  constructor(
    private readonly provider: AccountAggregatorProvider = createAaProvider(),
    private readonly env: AppEnv = getAppEnv(),
  ) {}

  get providerName(): "mock" | "setu" {
    return this.provider.name;
  }

  async connect(mobileNumber?: string): Promise<CreateConsentResult & { provider: string }> {
    const normalized =
      this.provider.name === "setu"
        ? parseCustomerMobileNumber(mobileNumber)
        : mobileNumber
          ? parseCustomerMobileNumber(mobileNumber)
          : undefined;

    const dataRange = getConfiguredDataRange(this.env);
    const redirectUrl = getRedirectUri(this.env);
    const result = await this.provider.createConsent({
      redirectUrl,
      dataRange,
      mobileNumber: normalized,
    });

    console.info("[AA] consent created", {
      provider: this.provider.name,
      consentId: maskId(result.consentId),
      status: result.status,
      mobileNumber: normalized ? maskMobileNumber(normalized) : undefined,
    });

    return { ...result, provider: this.provider.name };
  }

  async getStatus(consentId: string): Promise<ConsentStatusResult> {
    if (!consentId?.trim()) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }
    const result = await this.provider.getConsentStatus(consentId.trim());
    console.info("[AA] consent status", {
      provider: this.provider.name,
      consentId: maskId(result.consentId),
      status: result.status,
      canFetchData: result.canFetchData,
    });
    return result;
  }

  async createSession(consentId: string): Promise<DataSessionResult> {
    if (!consentId?.trim()) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }

    const status = await this.provider.getConsentStatus(consentId.trim());
    if (!status.canFetchData) {
      throw new AaError(
        "CONSENT_NOT_ACTIVE",
        `Cannot fetch financial data. Consent status is ${status.status}.`,
        403,
      );
    }

    const dataRange = status.dataRange ?? getConfiguredDataRange(this.env);

    const reusableSession = await this.findReusableSession(consentId.trim());
    if (reusableSession) {
      console.info("[AA] reusing session", {
        provider: this.provider.name,
        consentId: maskId(consentId.trim()),
        sessionId: maskId(reusableSession.sessionId),
        status: reusableSession.status,
      });

      return {
        sessionId: reusableSession.sessionId,
        consentId: consentId.trim(),
        status: reusableSession.status,
        dataRange,
        reused: true,
      };
    }

    const session = await this.provider.createFinancialDataSession(
      consentId.trim(),
      dataRange,
    );

    console.info("[AA] session created", {
      provider: this.provider.name,
      consentId: maskId(session.consentId),
      sessionId: maskId(session.sessionId),
      status: session.status,
      dataRange: session.dataRange,
    });

    return session;
  }

  async getTransactions(sessionId: string): Promise<FinancialDataResult> {
    if (!sessionId?.trim()) {
      throw new AaError("MISSING_SESSION_ID", "sessionId is required.", 400);
    }

    const result = await retryTransientAaOperation(() =>
      this.provider.getFinancialData(sessionId.trim()),
    );

    console.info("[AA] session data", {
      provider: this.provider.name,
      sessionId: maskId(result.sessionId),
      status: result.status,
      transactionCount: result.transactionCount ?? 0,
    });

    return result;
  }

  async getAccountAvailability(mobileNumber: string): Promise<{
    accounts: Array<{ aa: string; vua: string; status: boolean }>;
  }> {
    const normalized = parseCustomerMobileNumber(mobileNumber);

    if (this.provider.checkAccountAvailability) {
      const result = await this.provider.checkAccountAvailability(normalized);
      console.info("[AA] account availability", {
        provider: this.provider.name,
        mobileNumber: maskMobileNumber(normalized),
        accountCount: result.accounts.length,
      });
      return {
        accounts: result.accounts.map((a) => ({
          aa: a.aa,
          vua: a.vua,
          status: Boolean(a.status),
        })),
      };
    }

    return {
      accounts: [
        {
          aa: "mock",
          vua: normalized,
          status: true,
        },
      ],
    };
  }

  async listSessions(consentId: string): Promise<SessionListResult> {
    if (!consentId?.trim()) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }
    if (!this.provider.listDataSessions) {
      throw new AaError(
        "NOT_SUPPORTED",
        "Listing sessions is not supported by this provider.",
        501,
      );
    }
    return this.provider.listDataSessions(consentId.trim());
  }

  private async findReusableSession(
    consentId: string,
  ): Promise<{ sessionId: string; status: SessionStatus } | null> {
    if (!this.provider.listDataSessions) {
      return null;
    }

    const sessions = await this.provider.listDataSessions(consentId);
    const reusable = pickReusableSession(sessions.sessions);
    if (!reusable) {
      return null;
    }

    return {
      sessionId: reusable.sessionId,
      status: reusable.status,
    };
  }
}

export function getAaService(): AaService {
  return new AaService();
}

const REUSABLE_SESSION_STATUSES: SessionStatus[] = [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "PARTIAL",
];

function pickReusableSession(
  sessions: SessionListItem[],
): { sessionId: string; status: SessionStatus } | null {
  const sorted = [...sessions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const latest = sorted[0];
  if (!latest) {
    return null;
  }

  const normalizedStatus = normalizeSessionStatus(latest.status);
  if (
    normalizedStatus &&
    REUSABLE_SESSION_STATUSES.includes(normalizedStatus)
  ) {
    return {
      sessionId: latest.sessionId,
      status: normalizedStatus,
    };
  }

  return null;
}

function normalizeSessionStatus(status: string): SessionStatus | null {
  const upper = status.toUpperCase() as SessionStatus;
  const allowed: SessionStatus[] = [
    "ACTIVE",
    "PENDING",
    "COMPLETED",
    "EXPIRED",
    "FAILED",
    "PARTIAL",
  ];
  return allowed.includes(upper) ? upper : null;
}

async function retryTransientAaOperation<T>(
  operation: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientAaError(error)) {
        throw error;
      }

      attempt += 1;
      await sleep(250 * attempt);
    }
  }
}

function isTransientAaError(error: unknown): boolean {
  if (!(error instanceof AaError)) {
    return false;
  }

  return (
    error.statusCode >= 500 ||
    error.statusCode === 429 ||
    error.code === "SETU_NETWORK_ERROR" ||
    error.code === "SETU_RATE_LIMITED" ||
    error.code === "SETU_SERVER_ERROR" ||
    error.code === "SETU_REQUEST_FAILED"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
