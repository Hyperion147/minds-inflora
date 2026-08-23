"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { pollSessionTransactions } from "@/lib/aa/sessionPolling";
import type { EngineTransactionInput, InfloraResult } from "@/lib/inflation/types";
import type { InflationPipelineDiagnostics } from "@/lib/inflation";
import { formatDisplayDate, formatInr } from "@/lib/utils";
import { normalizeMobileInput } from "@/lib/aa/mobileInput";
import { getConsentIdFromCallbackParams } from "@/lib/aa/callbackParams";

function maskId(id: string): string {
  if (id.length <= 8) return "****";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

type ApiError = { error?: { code?: string; message?: string } };

const CONSENT_POLL_MS = 3_000;
const FI_POLL_WINDOW_MS = 4 * 60_000;
const CONSENT_POLL_TIMEOUT_MS = 90_000;

export function AaTestPanel({ providerLabel }: { providerLabel: string }) {
  const searchParams = useSearchParams();
  const queryConsentId = getConsentIdFromCallbackParams(searchParams);
  const queryError = searchParams.get("aa_message");
  
  const [consentId, setConsentId] = useState<string | null>(queryConsentId);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [canFetch, setCanFetch] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<EngineTransactionInput[]>(
    [],
  );
  const [inflation, setInflation] = useState<InfloraResult | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<InflationPipelineDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(queryError);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("Not connected");
  const [phaseDetail, setPhaseDetail] = useState<string | null>(null);
  const [sessionFips, setSessionFips] = useState<
    Array<{
      fipId?: string;
      accounts?: Array<{
        maskedAccNumber?: string;
        linkRefNumber?: string;
        status?: string;
        description?: string;
      }>;
    }>
  >([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [availability, setAvailability] = useState<
    Array<{ aa: string; vua: string; status: boolean }>
  >([]);
  const hasInitialized = useRef(false);

  const refreshStatus = useCallback(async (id: string) => {
    const res = await fetch(
      `/api/aa/status?consentId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as {
      status?: string;
      canFetchData?: boolean;
    } & ApiError;
    if (!res.ok) {
      throw new Error(data.error?.message ?? "Unable to load consent status.");
    }
    setConsentStatus(data.status ?? null);
    setCanFetch(Boolean(data.canFetchData));
    if (data.status === "ACTIVE") {
      setPhase("Consent ACTIVE");
    } else {
      setPhase(`Consent ${data.status}`);
    }
    setPhaseDetail(null);
    return data;
  }, []);

  useEffect(() => {
    // Only initialize once from query params
    if (!hasInitialized.current && queryConsentId) {
      hasInitialized.current = true;
      void refreshStatus(queryConsentId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Status check failed.");
      });
    }
  }, [queryConsentId, refreshStatus]);

  const calculateInflationForTransactions = useCallback(
    async (txns: EngineTransactionInput[]) => {
      const res = await fetch("/api/inflation/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: txns }),
      });
      const data = (await res.json()) as {
        result?: InfloraResult;
        diagnostics?: InflationPipelineDiagnostics;
      } & ApiError;
      if (!res.ok || !data.result) {
        throw new Error(
          data.error?.message ?? "Unable to calculate personal inflation.",
        );
      }
      setInflation(data.result);
      setDiagnostics(data.diagnostics ?? null);
    },
    [],
  );

  const fetchTransactionsForSession = useCallback(async (id: string) => {
    setPhase("Fetching your financial data...");
    setPhaseDetail("Waiting for Setu to finish preparing FI data.");

    const result = await pollSessionTransactions({
      sessionId: id,
      maxDurationMs: FI_POLL_WINDOW_MS,
      sleep,
      fetchSession: async (sessionId) => {
        const res = await fetch(
          `/api/aa/transactions?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          status?: string;
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
        } & ApiError;

        return {
          ok: res.ok,
          statusCode: res.status,
          data,
        };
      },
      onProgress: (progress) => {
        if (progress.phase === "polling") {
          setSessionStatus(progress.sessionStatus ?? "PENDING");
          setPhase("Fetching your financial data...");
          setPhaseDetail(
            progress.sessionStatus
              ? `Setu session is ${progress.sessionStatus}. This can take longer in sandbox mode.`
              : "Setu is still processing your FI data.",
          );
          return;
        }

        setPhase("Fetching your financial data...");
        setPhaseDetail(
          "Temporary Setu/network issue. Retrying automatically without starting a new FI session.",
        );
      },
    });

    if (result.kind === "processing") {
      setPhase("Financial data is still processing");
      setPhaseDetail(
        "Setu is taking longer than usual. You can retry safely and INFLORA will reuse the same FI session.",
      );
      return null;
    }

    if (result.kind === "failed") {
      setSessionFips(result.fips ?? []);
      setSessionStatus(result.status ?? "FAILED");
      setPhase("Financial data fetch failed");
      setPhaseDetail(formatSessionFailureDetails(result));
      throw new Error(result.message);
    }

    setSessionStatus(result.status);
    setSessionFips(result.fips ?? []);
    const txns = result.transactions;
    setTransactions(txns);
    setPhase(result.status === "PARTIAL" ? "Partial financial data ready" : "Financial data ready");
    setPhaseDetail(buildSessionSuccessDetail(result.status, txns.length, result));
    return txns;
  }, []);

  const createDataSession = useCallback(
    async (id: string) => {
      const res = await fetch("/api/aa/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId: id }),
      });
      const data = (await res.json()) as {
        sessionId?: string;
        status?: string;
        reused?: boolean;
      } & ApiError;
      if (!res.ok || !data.sessionId) {
        throw new Error(
          data.error?.message ?? "Unable to create FI data session.",
        );
      }

      setSessionId(data.sessionId);
      setSessionStatus(data.status ?? "PENDING");
      setPhase(
        data.status === "COMPLETED" || data.status === "PARTIAL"
          ? "Fetching your financial data..."
          : `Session ${data.status ?? "PENDING"}`,
      );
      setPhaseDetail(
        data.reused
          ? "Reusing your existing FI session so we do not start another Setu fetch."
          : null,
      );
      return data.sessionId;
    },
    [],
  );

  const waitForFetchableConsent = useCallback(
    async (id: string) => {
      const started = Date.now();

      while (Date.now() - started < CONSENT_POLL_TIMEOUT_MS) {
        const status = await refreshStatus(id);
        if (status.canFetchData) {
          return status;
        }

        if (
          status.status === "FAILED" ||
          status.status === "REJECTED" ||
          status.status === "REVOKED" ||
          status.status === "EXPIRED"
        ) {
          throw new Error(`Consent ${status.status.toLowerCase()}.`);
        }

        setPhase(`Waiting for consent approval (${status.status})`);
        setPhaseDetail(null);
        await sleep(CONSENT_POLL_MS);
      }

      throw new Error("Timed out waiting for consent approval (90s).");
    },
    [refreshStatus],
  );

  const resumeConsentFlow = useCallback(
    async (id: string) => {
      setBusy("resume");
      setError(null);
      setInflation(null);
      setDiagnostics(null);

      try {
        await waitForFetchableConsent(id);
        const newSessionId = await createDataSession(id);
        const txns = await fetchTransactionsForSession(newSessionId);
        if (!txns) {
          return;
        }
        if (txns.length === 0) {
          setPhase("No transactions returned");
          return;
        }
        setPhase("Calculating inflation...");
        setPhaseDetail(null);
        await calculateInflationForTransactions(txns);
        setPhase("Personal inflation ready");
        setPhaseDetail(null);
      } finally {
        setBusy(null);
      }
    },
    [
      calculateInflationForTransactions,
      createDataSession,
      fetchTransactionsForSession,
      waitForFetchableConsent,
    ],
  );

  const handleConsentReturn = useEffectEvent((returnedConsentId: string) => {
    void resumeConsentFlow(returnedConsentId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Consent flow failed.");
      setBusy(null);
    });
  });

  useEffect(() => {
    if (!queryConsentId || queryError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleConsentReturn(queryConsentId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [queryConsentId, queryError]);

  async function connect() {
    setBusy("connect");
    setError(null);
    setInflation(null);
    setDiagnostics(null);
    setTransactions([]);
    setSessionId(null);
    setSessionStatus(null);
    setSessionFips([]);
    setPhase("Creating consent...");
    setPhaseDetail(null);
    try {
      const res = await fetch("/api/aa/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: normalizeMobileInput(mobileNumber) }),
      });
      const data = (await res.json()) as {
        url?: string;
        consentUrl?: string;
        consentId?: string;
        status?: string;
      } & ApiError;
      const consentUrl = data.url ?? data.consentUrl;
      if (!res.ok || !consentUrl) {
        throw new Error(
          data.error?.message ?? "Unable to create consent session.",
        );
      }
      setConsentId(data.consentId ?? null);
      setConsentStatus(data.status ?? "PENDING");
      setPhase("Redirecting to consent...");
      window.location.assign(consentUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create consent.",
      );
      setPhase("Not connected");
      setBusy(null);
    }
  }

  async function checkAvailability() {
    setBusy("availability");
    setError(null);
    setAvailability([]);
    try {
      const res = await fetch("/api/aa/account-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: normalizeMobileInput(mobileNumber) }),
      });
      const data = (await res.json()) as {
        accounts?: Array<{ aa: string; vua: string; status: boolean }>;
      } & ApiError;
      if (!res.ok) {
        throw new Error(
          data.error?.message ?? "Unable to check account availability.",
        );
      }
      setAvailability(data.accounts ?? []);
      setPhase("Account availability loaded");
      setPhaseDetail(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check account availability.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function fetchFinancialData() {
    if (!consentId) return;
    setBusy("session");
    setError(null);
    setInflation(null);
    setDiagnostics(null);
    setSessionFips([]);
    setPhaseDetail(null);
    try {
      const status = await refreshStatus(consentId);
      if (!status.canFetchData) {
        throw new Error(
          `Consent is not ready for data fetch (status: ${status.status}).`,
        );
      }

      const newSessionId = await createDataSession(consentId);
      setBusy("poll");
      const txns = await fetchTransactionsForSession(newSessionId);
      if (!txns) {
        return;
      }
      if (txns.length === 0) {
        setPhase("No transactions returned");
        return;
      }
      setPhase("Calculating inflation...");
      setPhaseDetail(null);
      await calculateInflationForTransactions(txns);
      setPhase("Personal inflation ready");
      setPhaseDetail(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Financial information could not be fetched.",
      );
      setPhaseDetail(null);
    } finally {
      setBusy(null);
    }
  }

  async function calculateInflation() {
    if (transactions.length === 0) return;
    setBusy("inflate");
    setError(null);
    setPhaseDetail(null);
    try {
      await calculateInflationForTransactions(transactions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate personal inflation.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8 font-sans text-foreground">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          INFLORA
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          Connect Live Financial Accounts
        </h1>
        <dl className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-muted-foreground">Provider: </dt>
            <dd className="inline font-medium">{providerLabel}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Status: </dt>
            <dd className="inline font-medium">{phase}</dd>
          </div>
          {consentId ? (
            <div>
              <dt className="inline text-muted-foreground">Consent ID: </dt>
              <dd className="inline font-mono text-xs">{maskId(consentId)}</dd>
            </div>
          ) : null}
          {consentStatus ? (
            <div>
              <dt className="inline text-muted-foreground">Consent status: </dt>
              <dd className="inline font-medium">{consentStatus}</dd>
            </div>
          ) : null}
          {sessionId ? (
            <div>
              <dt className="inline text-muted-foreground">Session: </dt>
              <dd className="inline font-mono text-xs">{maskId(sessionId)}</dd>
            </div>
          ) : null}
          {sessionStatus ? (
            <div>
              <dt className="inline text-muted-foreground">Session status: </dt>
              <dd className="inline font-medium">{sessionStatus}</dd>
            </div>
          ) : null}
        </dl>
        {phaseDetail ? (
          <p className="mt-3 text-sm text-muted-foreground">{phaseDetail}</p>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded border border-destructive bg-destructive px-3 py-2 text-sm text-destructive-foreground"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-muted-foreground">Customer mobile number</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(normalizeMobileInput(e.target.value))}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
      </div>

      {availability.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {availability.map((account) => (
            <li key={`${account.aa}-${account.vua}`}>
              {account.aa}: {account.vua} — {account.status ? "available" : "unavailable"}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void checkAvailability()}
          className="rounded border border-input px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        >
          {busy === "availability" ? "Checking…" : "Check account availability"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void connect()}
          className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === "connect" ? "Creating consent…" : "Connect Financial Accounts"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !canFetch}
          onClick={() => void fetchFinancialData()}
          className="rounded border border-input px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        >
          {busy === "session" || busy === "poll"
            ? "Fetching your financial data..."
            : "Fetch My Financial Data"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || transactions.length === 0}
          onClick={() => void calculateInflation()}
          className="rounded border border-input px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        >
          {busy === "inflate"
            ? "Calculating…"
            : "Calculate My Personal Inflation"}
        </button>
      </div>

      {transactions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Transactions fetched: {transactions.length}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatDisplayDate(txn.date)}
                    </td>
                    <td className="py-2 pr-4">
                      {txn.description ?? txn.merchant ?? "—"}
                    </td>
                    <td className="py-2 pr-4 capitalize">
                      {txn.type === "CREDIT" ? "Credit" : "Debit"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatInr(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sessionFips.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">FI Account Status</h2>
          <ul className="space-y-1 text-sm">
            {sessionFips.flatMap((fip) =>
              (fip.accounts ?? []).map((account) => {
                const isAvailable = isFetchableAccountStatus(account.status);
                return (
                  <li
                    key={`${fip.fipId}-${account.linkRefNumber ?? account.maskedAccNumber ?? account.status}`}
                    className={isAvailable ? "text-foreground" : "text-muted-foreground"}
                  >
                    {[fip.fipId, account.maskedAccNumber, account.status, account.description]
                      .filter(Boolean)
                      .join(" / ")}{" "}
                    {!isAvailable ? "— unavailable" : "— used if data was available"}
                  </li>
                );
              }),
            )}
          </ul>
        </section>
      ) : null}

      {inflation ? (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">Personal Inflation</h2>
          {inflation.calculationStatus !== "OK" ? (
            <p className="rounded border border-border bg-muted px-3 py-2 text-sm text-foreground">
              Personal inflation is unavailable because categorization coverage is insufficient for the fetched transactions.
            </p>
          ) : null}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Personal Inflation</dt>
              <dd className="text-xl font-semibold">
                {inflation.calculationStatus === "OK"
                  ? `${inflation.personalInflation.toFixed(2)}%`
                  : "Insufficient data"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Headline CPI</dt>
              <dd className="text-xl font-semibold">
                {inflation.headlineInflation.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Difference</dt>
              <dd className="font-medium">
                {inflation.calculationStatus === "OK"
                  ? `${inflation.differenceFromHeadline.toFixed(2)} pp (${inflation.direction})`
                  : "Insufficient data"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Eligible spend</dt>
              <dd className="font-medium">
                {formatInr(inflation.totalEligibleSpend)}
              </dd>
            </div>
          </dl>
          <h3 className="pt-2 font-medium">Top Drivers</h3>
          <ul className="space-y-1 text-sm">
            {inflation.topDrivers.map((d) => (
              <li key={d.categoryId}>
                {d.categoryName}: {d.contributionPercentagePoints.toFixed(2)} pp
                (≈ ₹{d.per100Impact.toFixed(2)} / ₹100)
              </li>
            ))}
          </ul>
          {diagnostics ? (
            <div className="rounded border border-border bg-card p-3 text-xs text-muted-foreground">
              <h3 className="font-medium text-foreground">
                Categorization summary
              </h3>
              <p className="mt-1">
                Eligible: {diagnostics.eligibleCount} /{" "}
                {diagnostics.transactionCount}; mapped categories:{" "}
                {diagnostics.mappedCategoryCount}; uncategorized spend:{" "}
                {formatInr(diagnostics.uncategorizedSpend)} (
                {diagnostics.uncategorizedPercentage.toFixed(2)}%).
              </p>
              <p className="mt-1">
                Categorized spend used for inflation:{" "}
                {formatInr(inflation.categorizedSpend)}.
              </p>
              {diagnostics.topCategorySamples.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {diagnostics.topCategorySamples.map((sample) => (
                    <li key={sample.id}>
                      {sample.descriptionSample ||
                        sample.merchantNormalized ||
                        "No description"}{" "}
                      {"->"} {sample.categoryId} ({sample.exclusionReason})
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSessionFailureDetails(result: {
  traceId?: string;
  txnId?: string;
  fips?: Array<{
    fipId?: string;
    accounts?: Array<{
      maskedAccNumber?: string;
      status?: string;
      description?: string;
    }>;
  }>;
}): string | null {
  const states = (result.fips ?? []).flatMap((fip) =>
    (fip.accounts ?? []).map((account) =>
      [fip.fipId, account.maskedAccNumber, account.status, account.description]
        .filter(Boolean)
        .join(" / "),
    ),
  );

  const details = [
    states.length > 0 ? `Provider statuses: ${states.join("; ")}` : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join(" | ") : null;
}

function buildSessionSuccessDetail(
  status: string,
  transactionCount: number,
  result: {
    providerMessage?: string;
    traceId?: string;
    txnId?: string;
    fips?: Array<{
      fipId?: string;
      accounts?: Array<{
        maskedAccNumber?: string;
        status?: string;
        description?: string;
      }>;
    }>;
  },
): string | null {
  const unavailable = (result.fips ?? []).flatMap((fip) =>
    (fip.accounts ?? [])
      .filter((account) => !isFetchableAccountStatus(account.status))
      .map((account) =>
        [fip.fipId, account.maskedAccNumber, account.status, account.description]
          .filter(Boolean)
          .join(" / "),
      ),
  );

  if (status === "PARTIAL") {
    const parts = [
      transactionCount > 0
        ? `Using transactions from available Setu accounts.`
        : `Setu returned a PARTIAL session but no transactions were available from READY accounts.`,
      unavailable.length > 0
        ? `Unavailable accounts: ${unavailable.join("; ")}.`
        : null,
    ].filter(Boolean);

    return parts.join(" ");
  }

  if (status === "FAILED" || status === "EXPIRED") {
    const parts = [
      transactionCount > 0
        ? "Setu marked the overall session as failed, but some account data was still usable."
        : null,
      unavailable.length > 0
        ? `Unavailable accounts: ${unavailable.join("; ")}.`
        : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : result.providerMessage ?? null;
  }

  if (transactionCount === 0) {
    return "Setu completed the FI session, but returned no transactions for the selected range.";
  }

  return null;
}

function isFetchableAccountStatus(status: string | undefined): boolean {
  const normalized = status?.toUpperCase();
  return normalized === "READY" || normalized === "DELIVERED" || !normalized;
}
