import { createId } from "@/lib/utils";
import type { AppEnv } from "@/lib/env";
import { loadDemoTransactionsCsv } from "@/lib/inflation";
import type { AccountAggregatorProvider } from "../provider";
import type {
  ConsentStatus,
  ConsentStatusResult,
  CreateConsentResult,
  DataRange,
  DataSessionResult,
  FinancialDataResult,
  SessionListResult,
  SessionStatus,
} from "../types";
import { AaError } from "../types";

type MockConsent = {
  id: string;
  status: ConsentStatus;
  url: string;
  dataRange: DataRange;
  createdAt: string;
};

type MockSession = {
  id: string;
  consentId: string;
  status: SessionStatus;
  dataRange: DataRange;
  createdAt: string;
  /** ticks until COMPLETED for polling simulation */
  pendingTicks: number;
};

const globalMock = globalThis as unknown as {
  __infloraMockAa?: {
    consents: Map<string, MockConsent>;
    sessions: Map<string, MockSession>;
  };
};

function store() {
  if (!globalMock.__infloraMockAa) {
    globalMock.__infloraMockAa = {
      consents: new Map(),
      sessions: new Map(),
    };
  }
  return globalMock.__infloraMockAa;
}

export function resetMockAaForTests(): void {
  store().consents.clear();
  store().sessions.clear();
}

/**
 * Local AA simulation — no Setu credentials required.
 * Uses demo_transactions.csv for FI data.
 */
export class MockAaProvider implements AccountAggregatorProvider {
  readonly name = "mock" as const;

  constructor(private readonly env: AppEnv) {}

  async createConsent(input: {
    redirectUrl: string;
    dataRange: DataRange;
    mobileNumber?: string;
  }): Promise<CreateConsentResult> {
    const id = createId("mock_consent");
    const consentUrl = new URL("/aa/mock-consent", this.env.APP_BASE_URL);
    consentUrl.searchParams.set("consentId", id);
    consentUrl.searchParams.set("redirect", input.redirectUrl);

    const consent: MockConsent = {
      id,
      status: "PENDING",
      url: consentUrl.toString(),
      dataRange: input.dataRange,
      createdAt: new Date().toISOString(),
    };
    store().consents.set(id, consent);

    return {
      consentId: id,
      consentUrl: consent.url,
      status: "PENDING",
    };
  }

  async getConsentStatus(consentId: string): Promise<ConsentStatusResult> {
    const consent = store().consents.get(consentId);
    if (!consent) {
      throw new AaError("CONSENT_NOT_FOUND", "Consent not found.", 404);
    }
    return {
      consentId: consent.id,
      status: consent.status,
      canFetchData: consent.status === "ACTIVE",
    };
  }

  /** Used by mock consent page */
  setConsentStatus(consentId: string, status: ConsentStatus): void {
    const consent = store().consents.get(consentId);
    if (!consent) {
      throw new AaError("CONSENT_NOT_FOUND", "Consent not found.", 404);
    }
    consent.status = status;
    store().consents.set(consentId, consent);
  }

  async createFinancialDataSession(
    consentId: string,
    dataRange: DataRange,
  ): Promise<DataSessionResult> {
    const consent = store().consents.get(consentId);
    if (!consent) {
      throw new AaError("CONSENT_NOT_FOUND", "Consent not found.", 404);
    }
    if (consent.status !== "ACTIVE") {
      throw new AaError(
        "CONSENT_NOT_ACTIVE",
        "Consent is not active.",
        403,
      );
    }

    const id = createId("mock_session");
    const session: MockSession = {
      id,
      consentId,
      status: "PENDING",
      dataRange,
      createdAt: new Date().toISOString(),
      pendingTicks: 1,
    };
    store().sessions.set(id, session);

    return {
      sessionId: id,
      consentId,
      status: "PENDING",
      dataRange,
    };
  }

  async getFinancialData(sessionId: string): Promise<FinancialDataResult> {
    const session = store().sessions.get(sessionId);
    if (!session) {
      throw new AaError("SESSION_NOT_FOUND", "Session not found.", 404);
    }

    if (session.status === "PENDING") {
      if (session.pendingTicks > 0) {
        session.pendingTicks -= 1;
        store().sessions.set(sessionId, session);
        return {
          sessionId: session.id,
          consentId: session.consentId,
          status: "PENDING",
        };
      }
      session.status = "COMPLETED";
      store().sessions.set(sessionId, session);
    }

    if (session.status === "FAILED" || session.status === "EXPIRED") {
      throw new AaError(
        "FI_SESSION_FAILED",
        `Financial information session ${session.status.toLowerCase()}.`,
        400,
      );
    }

    const transactions = loadDemoTransactionsCsv();
    return {
      sessionId: session.id,
      consentId: session.consentId,
      status: "COMPLETED",
      transactions,
      transactionCount: transactions.length,
    };
  }

  async listDataSessions(consentId: string): Promise<SessionListResult> {
    const sessions = [...store().sessions.values()]
      .filter((s) => s.consentId === consentId)
      .map((s) => ({
        sessionId: s.id,
        status: s.status,
        createdAt: s.createdAt,
      }));

    return { consentId, sessions };
  }
}

export function getMockProviderFromStore(
  env: AppEnv,
): MockAaProvider {
  return new MockAaProvider(env);
}
