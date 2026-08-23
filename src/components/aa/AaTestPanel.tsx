"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Database,
  Landmark,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6 font-sans text-foreground">
      <Card className="overflow-hidden border-dashed bg-card">
        <CardHeader className="border-b border-dashed border-border">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Live Account Aggregator</Badge>
                <Badge variant={badgeVariantForStatus(phase)}>{phase}</Badge>
              </div>
              <div>
                <CardDescription>INFLORA secure data connection</CardDescription>
                <CardTitle className="mt-3 text-4xl leading-none sm:text-5xl">
                  Connect live financial accounts.
                </CardTitle>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Use Account Aggregator consent to fetch read-only transaction data,
                then run the same personal inflation pipeline used by the showcase dashboard.
              </p>
            </div>
            <Button asChild variant="outline" className="border-dashed">
              <Link href="/dashboard?mode=showcase">
                Back to Showcase
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile icon={Landmark} label="Provider" value={providerLabel} />
          <StatusTile icon={ShieldCheck} label="Consent" value={consentStatus ?? "Not started"} />
          <StatusTile icon={Database} label="FI session" value={sessionStatus ?? "Not created"} />
          <StatusTile icon={WalletCards} label="Transactions" value={String(transactions.length)} />
        </CardContent>
      </Card>

      {phaseDetail ? (
        <Alert>
          <CircleAlert className="mb-2 h-4 w-4" />
          <AlertTitle>Current status</AlertTitle>
          <AlertDescription>{phaseDetail}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <CircleAlert className="mb-2 h-4 w-4" />
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="min-w-0 bg-card">
          <CardHeader>
            <CardDescription>Step 1</CardDescription>
            <CardTitle>Start with your mobile number</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Customer mobile number
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(normalizeMobileInput(e.target.value))}
                className="h-11 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="grid gap-3">
              <Button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void checkAvailability()}
                variant="outline"
                className="justify-between border-dashed"
              >
                <span>{busy === "availability" ? "Checking..." : "Check account availability"}</span>
                {busy === "availability" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void connect()}
                className="justify-between"
              >
                <span>{busy === "connect" ? "Creating consent..." : "Connect Financial Accounts"}</span>
                {busy === "connect" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {availability.length > 0 ? (
              <div className="rounded-sm border border-dashed border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Account availability
                </p>
                <div className="mt-3 space-y-2">
                  {availability.map((account) => (
                    <div
                      key={`${account.aa}-${account.vua}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-muted-foreground">
                        {account.aa} / {account.vua}
                      </span>
                      <Badge variant={account.status ? "success" : "warning"}>
                        {account.status ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 bg-card">
          <CardHeader>
            <CardDescription>Step 2</CardDescription>
            <CardTitle>Fetch data and calculate inflation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                disabled={Boolean(busy) || !canFetch}
                onClick={() => void fetchFinancialData()}
                variant="outline"
                className="justify-between border-dashed"
              >
                <span>
                  {busy === "session" || busy === "poll"
                    ? "Fetching financial data..."
                    : "Fetch Financial Data"}
                </span>
                {busy === "session" || busy === "poll" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                disabled={Boolean(busy) || transactions.length === 0}
                onClick={() => void calculateInflation()}
                variant="outline"
                className="justify-between border-dashed"
              >
                <span>{busy === "inflate" ? "Calculating..." : "Calculate Inflation"}</span>
                {busy === "inflate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              {consentId ? <InfoLine label="Consent ID" value={maskId(consentId)} /> : null}
              {sessionId ? <InfoLine label="Session" value={maskId(sessionId)} /> : null}
              <InfoLine label="Phase" value={phase} />
              <InfoLine label="Ready to fetch" value={canFetch ? "Yes" : "No"} />
            </div>
          </CardContent>
        </Card>
      </section>

      {sessionFips.length > 0 ? (
        <Card className="bg-card">
          <CardHeader>
            <CardDescription>Provider diagnostics</CardDescription>
            <CardTitle>FI account status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionFips.flatMap((fip) =>
              (fip.accounts ?? []).map((account) => {
                const isAvailable = isFetchableAccountStatus(account.status);
                return (
                  <div
                    key={`${fip.fipId}-${account.linkRefNumber ?? account.maskedAccNumber ?? account.status}`}
                    className="flex flex-col gap-2 rounded-sm border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{fip.fipId ?? "FIP"}</p>
                      <p className="text-sm text-muted-foreground">
                        {[account.maskedAccNumber, account.description].filter(Boolean).join(" / ") ||
                          "Account details unavailable"}
                      </p>
                    </div>
                    <Badge variant={isAvailable ? "success" : "warning"}>
                      {isAvailable ? "Usable" : account.status ?? "Unavailable"}
                    </Badge>
                  </div>
                );
              }),
            )}
          </CardContent>
        </Card>
      ) : null}

      {transactions.length > 0 ? (
        <Card className="min-w-0 bg-card">
          <CardHeader>
            <CardDescription>Fetched from Account Aggregator</CardDescription>
            <CardTitle>Transactions fetched: {transactions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDisplayDate(txn.date)}
                    </TableCell>
                    <TableCell className="max-w-[22rem] truncate font-medium">
                      {txn.description ?? txn.merchant ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={txn.type === "CREDIT" ? "success" : "secondary"}>
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInr(txn.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length > 20 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Showing latest 20 of {transactions.length} transactions.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {inflation ? (
        <Card className="border-primary bg-card">
          <CardHeader>
            <CardDescription>Inflation result</CardDescription>
            <CardTitle>Personal inflation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {inflation.calculationStatus !== "OK" ? (
              <Alert variant="warning">
                <CircleAlert className="mb-2 h-4 w-4" />
                <AlertTitle>Insufficient categorization</AlertTitle>
                <AlertDescription>
                  Personal inflation is unavailable because categorization coverage is
                  insufficient for the fetched transactions.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-4">
              <MetricBox
                label="Personal Inflation"
                value={
                  inflation.calculationStatus === "OK"
                    ? `${inflation.personalInflation.toFixed(2)}%`
                    : "Insufficient"
                }
              />
              <MetricBox label="Headline CPI" value={`${inflation.headlineInflation.toFixed(2)}%`} />
              <MetricBox
                label="Difference"
                value={
                  inflation.calculationStatus === "OK"
                    ? `${inflation.differenceFromHeadline.toFixed(2)} pp`
                    : "Insufficient"
                }
              />
              <MetricBox label="Eligible spend" value={formatInr(inflation.totalEligibleSpend)} />
            </div>

            {inflation.topDrivers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Top drivers
                </p>
                <div className="grid gap-3">
                  {inflation.topDrivers.map((driver) => (
                    <div
                      key={driver.categoryId}
                      className="flex items-center justify-between gap-4 rounded-sm border border-border px-4 py-3"
                    >
                      <span className="text-sm font-medium">{driver.categoryName}</span>
                      <Badge variant="secondary">
                        {driver.contributionPercentagePoints.toFixed(2)} pp
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {diagnostics ? (
              <div className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Categorization summary</p>
                <p className="mt-2">
                  Eligible: {diagnostics.eligibleCount} / {diagnostics.transactionCount};
                  mapped categories: {diagnostics.mappedCategoryCount}; uncategorized spend:{" "}
                  {formatInr(diagnostics.uncategorizedSpend)} (
                  {diagnostics.uncategorizedPercentage.toFixed(2)}%).
                </p>
                <p className="mt-1">
                  Categorized spend used for inflation: {formatInr(inflation.categorizedSpend)}.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-border bg-background px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-dashed border-border bg-background px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function badgeVariantForStatus(
  status: string,
): "success" | "warning" | "destructive" | "secondary" {
  const normalized = status.toUpperCase();

  if (
    normalized.includes("ACTIVE") ||
    normalized.includes("READY") ||
    normalized.includes("LOADED")
  ) {
    return "success";
  }

  if (
    normalized.includes("FAILED") ||
    normalized.includes("ERROR") ||
    normalized.includes("REJECTED") ||
    normalized.includes("EXPIRED") ||
    normalized.includes("REVOKED")
  ) {
    return "destructive";
  }

  if (
    normalized.includes("FETCHING") ||
    normalized.includes("WAITING") ||
    normalized.includes("CREATING") ||
    normalized.includes("REDIRECTING") ||
    normalized.includes("SESSION") ||
    normalized.includes("PARTIAL")
  ) {
    return "warning";
  }

  return "secondary";
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
