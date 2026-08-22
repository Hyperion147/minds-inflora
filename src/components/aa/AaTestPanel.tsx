"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EngineTransactionInput } from "@/lib/inflation/types";
import type { InfloraResult } from "@/lib/inflation/types";
import { formatDisplayDate, formatInr } from "@/lib/utils";

function maskId(id: string): string {
  if (id.length <= 8) return "****";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

type ApiError = { error?: { code?: string; message?: string } };

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

export function AaTestPanel({ providerLabel }: { providerLabel: string }) {
  const searchParams = useSearchParams();
  const queryConsentId = searchParams.get("consentId");
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
  const [error, setError] = useState<string | null>(queryError);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("Not connected");
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

  async function connect() {
    setBusy("connect");
    setError(null);
    setInflation(null);
    setTransactions([]);
    setSessionId(null);
    setSessionStatus(null);
    setPhase("Creating consent...");
    try {
      const res = await fetch("/api/aa/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber }),
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
        body: JSON.stringify({ mobileNumber }),
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
    try {
      const status = await refreshStatus(consentId);
      if (!status.canFetchData) {
        throw new Error(
          `Consent is not ready for data fetch (status: ${status.status}).`,
        );
      }

      const res = await fetch("/api/aa/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId }),
      });
      const data = (await res.json()) as {
        sessionId?: string;
        status?: string;
      } & ApiError;
      if (!res.ok || !data.sessionId) {
        throw new Error(
          data.error?.message ?? "Unable to create FI data session.",
        );
      }

      setSessionId(data.sessionId);
      setSessionStatus(data.status ?? "PENDING");
      setPhase(`Session ${data.status ?? "PENDING"}`);
      setBusy("poll");
      await pollTransactions(data.sessionId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Financial information could not be fetched.",
      );
      setBusy(null);
    }
  }

  async function pollTransactions(id: string) {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      const res = await fetch(
        `/api/aa/transactions?sessionId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        status?: string;
        transactions?: EngineTransactionInput[];
        transactionCount?: number;
      } & ApiError;

      if (!res.ok) {
        throw new Error(
          data.error?.message ?? "Unable to fetch session transactions.",
        );
      }

      setSessionStatus(data.status ?? null);

      if (data.status === "PENDING" || data.status === "ACTIVE") {
        setPhase(`Session ${data.status}`);
        await sleep(POLL_MS);
        continue;
      }

      if (data.status === "FAILED" || data.status === "EXPIRED") {
        throw new Error(`FI session ${data.status?.toLowerCase()}.`);
      }

      const txns = data.transactions ?? [];
      setTransactions(txns);
      setPhase("COMPLETED");
      setBusy(null);
      return;
    }

    throw new Error("Timed out waiting for financial data (60s).");
  }

  async function calculateInflation() {
    if (transactions.length === 0) return;
    setBusy("inflate");
    setError(null);
    try {
      const res = await fetch("/api/inflation/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      const data = (await res.json()) as {
        result?: InfloraResult;
      } & ApiError;
      if (!res.ok || !data.result) {
        throw new Error(
          data.error?.message ?? "Unable to calculate personal inflation.",
        );
      }
      setInflation(data.result);
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
    <div className="space-y-8 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium tracking-wide text-zinc-500">
          INFLORA
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          Account Aggregator Integration Test
        </h1>
        <dl className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-zinc-500">Provider: </dt>
            <dd className="inline font-medium">{providerLabel}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">Status: </dt>
            <dd className="inline font-medium">{phase}</dd>
          </div>
          {consentId ? (
            <div>
              <dt className="inline text-zinc-500">Consent ID: </dt>
              <dd className="inline font-mono text-xs">{maskId(consentId)}</dd>
            </div>
          ) : null}
          {consentStatus ? (
            <div>
              <dt className="inline text-zinc-500">Consent status: </dt>
              <dd className="inline font-medium">{consentStatus}</dd>
            </div>
          ) : null}
          {sessionId ? (
            <div>
              <dt className="inline text-zinc-500">Session: </dt>
              <dd className="inline font-mono text-xs">{maskId(sessionId)}</dd>
            </div>
          ) : null}
          {sessionStatus ? (
            <div>
              <dt className="inline text-zinc-500">Session status: </dt>
              <dd className="inline font-medium">{sessionStatus}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-zinc-500">Customer mobile number</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
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
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        >
          {busy === "availability" ? "Checking…" : "Check account availability"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void connect()}
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy === "connect" ? "Creating consent…" : "Connect Financial Accounts"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !canFetch}
          onClick={() => void fetchFinancialData()}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        >
          {busy === "session" || busy === "poll"
            ? "Fetching…"
            : "Fetch My Financial Data"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || transactions.length === 0}
          onClick={() => void calculateInflation()}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
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
                <tr className="border-b border-zinc-300 text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-zinc-100">
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

      {inflation ? (
        <section className="space-y-3 border-t border-zinc-200 pt-6">
          <h2 className="text-lg font-semibold">Personal Inflation</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Personal Inflation</dt>
              <dd className="text-xl font-semibold">
                {inflation.personalInflation.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Headline CPI</dt>
              <dd className="text-xl font-semibold">
                {inflation.headlineInflation.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Difference</dt>
              <dd className="font-medium">
                {inflation.differenceFromHeadline.toFixed(2)} pp (
                {inflation.direction})
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Eligible spend</dt>
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
        </section>
      ) : null}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
