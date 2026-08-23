import type { EngineTransactionInput } from "@/lib/inflation/types";

type SessionApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type SessionPollResponse = {
  ok: boolean;
  statusCode: number;
  data: {
    status?: string;
    sessionId?: string;
    consentId?: string;
    transactions?: EngineTransactionInput[];
    transactionCount?: number;
    traceId?: string;
    txnId?: string;
    providerMessage?: string;
    fips?: Array<{
      fipId?: string;
      accounts?: Array<{
        maskedAccNumber?: string;
        linkRefNumber?: string;
        status?: string;
        description?: string;
      }>;
    }>;
  } & SessionApiError;
};

export type SessionPollProgress =
  | {
      phase: "polling";
      attempt: number;
      sessionStatus?: string;
      nextDelayMs: number;
    }
  | {
      phase: "retrying";
      attempt: number;
      nextDelayMs: number;
      errorCode?: string;
      message: string;
    };

export type SessionPollResult =
  | {
      kind: "ready";
      status: string;
      transactions: EngineTransactionInput[];
      transactionCount: number;
      providerMessage?: string;
      traceId?: string;
      txnId?: string;
      fips?: SessionPollResponse["data"]["fips"];
    }
  | {
      kind: "processing";
      status?: string;
      reason: "timeout";
      message: string;
    }
  | {
      kind: "failed";
      status?: string;
      errorCode?: string;
      message: string;
      traceId?: string;
      txnId?: string;
      providerMessage?: string;
      fips?: SessionPollResponse["data"]["fips"];
    };

type PollSessionOptions = {
  sessionId: string;
  fetchSession: (sessionId: string) => Promise<SessionPollResponse>;
  sleep: (ms: number) => Promise<void>;
  now?: () => number;
  maxDurationMs?: number;
  maxTransientRetries?: number;
  onProgress?: (progress: SessionPollProgress) => void;
};

const DEFAULT_MAX_DURATION_MS = 4 * 60_000;
const DEFAULT_MAX_TRANSIENT_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "SETU_NETWORK_ERROR",
  "SETU_RATE_LIMITED",
  "SETU_SERVER_ERROR",
  "SETU_REQUEST_FAILED",
]);

export async function pollSessionTransactions({
  sessionId,
  fetchSession,
  sleep,
  now = Date.now,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  maxTransientRetries = DEFAULT_MAX_TRANSIENT_RETRIES,
  onProgress,
}: PollSessionOptions): Promise<SessionPollResult> {
  const startedAt = now();
  let pollAttempt = 0;
  let transientFailures = 0;
  let lastSessionStatus: string | undefined;

  while (now() - startedAt < maxDurationMs) {
    try {
      const response = await fetchSession(sessionId);
      const { data } = response;

      if (!response.ok) {
        const message =
          data.error?.message ?? "Unable to fetch session transactions.";

        if (
          isRetryableSessionError(response.statusCode, data.error?.code) &&
          transientFailures < maxTransientRetries
        ) {
          transientFailures += 1;
          const delayMs = getSessionPollDelayMs(pollAttempt);
          onProgress?.({
            phase: "retrying",
            attempt: pollAttempt,
            nextDelayMs: delayMs,
            errorCode: data.error?.code,
            message,
          });
          pollAttempt += 1;
          await sleep(delayMs);
          continue;
        }

        return {
          kind: "failed",
          status: data.status,
          errorCode: data.error?.code,
          message,
          traceId: data.traceId,
          txnId: data.txnId,
          providerMessage: data.providerMessage,
          fips: data.fips,
        };
      }

      transientFailures = 0;
      lastSessionStatus = data.status;

      if (data.status === "PENDING" || data.status === "ACTIVE") {
        const delayMs = getSessionPollDelayMs(pollAttempt);
        onProgress?.({
          phase: "polling",
          attempt: pollAttempt,
          sessionStatus: data.status,
          nextDelayMs: delayMs,
        });
        pollAttempt += 1;
        await sleep(delayMs);
        continue;
      }

      if (data.status === "FAILED" || data.status === "EXPIRED") {
        if (hasUsableReturnedData(data)) {
          const transactions = data.transactions ?? [];
          return {
            kind: "ready",
            status: data.status,
            transactions,
            transactionCount: data.transactionCount ?? transactions.length,
            providerMessage: data.providerMessage,
            traceId: data.traceId,
            txnId: data.txnId,
            fips: data.fips,
          };
        }

        return {
          kind: "failed",
          status: data.status,
          message:
            data.providerMessage ?? `FI session ${data.status.toLowerCase()}.`,
          traceId: data.traceId,
          txnId: data.txnId,
          providerMessage: data.providerMessage,
          fips: data.fips,
        };
      }

      const transactions = data.transactions ?? [];
      return {
        kind: "ready",
        status: data.status ?? "COMPLETED",
        transactions,
        transactionCount: data.transactionCount ?? transactions.length,
        providerMessage: data.providerMessage,
        traceId: data.traceId,
        txnId: data.txnId,
        fips: data.fips,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch session transactions.";

      if (
        isRetryableThrownError(error) &&
        transientFailures < maxTransientRetries
      ) {
        transientFailures += 1;
        const delayMs = getSessionPollDelayMs(pollAttempt);
        onProgress?.({
          phase: "retrying",
          attempt: pollAttempt,
          nextDelayMs: delayMs,
          message,
        });
        pollAttempt += 1;
        await sleep(delayMs);
        continue;
      }

      return {
        kind: "failed",
        message,
      };
    }
  }

  return {
    kind: "processing",
    status: lastSessionStatus,
    reason: "timeout",
    message:
      "Financial data is still being processed by the provider. It exceeded our polling window.",
  };
}

function hasUsableReturnedData(data: SessionPollResponse["data"]): boolean {
  if ((data.transactionCount ?? data.transactions?.length ?? 0) > 0) {
    return true;
  }

  return (data.fips ?? []).some((fip) =>
    (fip.accounts ?? []).some((account) => {
      const status = account.status?.toUpperCase();
      return status === "READY" || status === "DELIVERED";
    }),
  );
}

export function getSessionPollDelayMs(attempt: number): number {
  const delays = [1_500, 2_500, 4_000, 6_500, 10_000, 15_000];
  return delays[Math.min(attempt, delays.length - 1)]!;
}

function isRetryableSessionError(
  statusCode: number,
  errorCode: string | undefined,
): boolean {
  return (
    RETRYABLE_STATUS_CODES.has(statusCode) ||
    Boolean(errorCode && RETRYABLE_ERROR_CODES.has(errorCode))
  );
}

function isRetryableThrownError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /network|fetch|timeout|temporar|503|502|429/i.test(error.message);
}
