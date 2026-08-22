import { createHash } from "crypto";
import type { EngineTransactionInput } from "@/lib/inflation/types";
import type {
  DepositJSON,
  FIDataFetchResponseV2,
  FIFetchAccountItem,
  SetuDepositTransaction,
} from "./setu/types";

/**
 * Convert Setu FIDataFetchResponseV2 DEPOSIT accounts → EngineTransactionInput[].
 * Does not invent merchants. Deduplicates across accounts.
 * Inflation engine stays unaware of Setu.
 */
export function normalizeSetuFiDataToEngineTransactions(
  session: FIDataFetchResponseV2,
): EngineTransactionInput[] {
  const collected: EngineTransactionInput[] = [];

  for (const fip of session.fips ?? []) {
    for (const accountItem of fip.accounts ?? []) {
      const deposit = asDepositJson(accountItem);
      if (!deposit?.account) continue;

      const currency = deposit.account.summary?.currency?.trim() || "INR";
      const rawTxns = deposit.account.transactions?.transaction ?? [];

      for (const raw of rawTxns) {
        const normalized = normalizeSetuDepositTransaction(raw, currency);
        if (normalized) {
          collected.push(normalized);
        }
      }
    }
  }

  return dedupeEngineTransactions(collected);
}

export function normalizeSetuDepositTransaction(
  raw: SetuDepositTransaction,
  currency = "INR",
): EngineTransactionInput | null {
  const amount = parseAmount(raw.amount);
  if (amount === null) {
    return null;
  }

  const type = normalizeTxnType(raw.type);
  if (!type) {
    return null;
  }

  const date = raw.transactionTimestamp?.trim() || raw.valueDate?.trim();
  if (!date) {
    return null;
  }

  const description = raw.narration?.trim() || undefined;
  const id =
    raw.txnId?.trim() ||
    raw.reference?.trim() ||
    deterministicTxnId({ date, amount, narration: description, type });

  return {
    id,
    date,
    // Do not hallucinate merchant — categorization uses description/narration
    merchant: undefined,
    description,
    amount,
    currency,
    type,
  };
}

export function dedupeEngineTransactions(
  transactions: EngineTransactionInput[],
): EngineTransactionInput[] {
  const seen = new Set<string>();
  const result: EngineTransactionInput[] = [];

  for (const txn of transactions) {
    if (seen.has(txn.id)) continue;
    seen.add(txn.id);
    result.push(txn);
  }

  return result;
}

function asDepositJson(accountItem: FIFetchAccountItem): DepositJSON | null {
  const data = accountItem.data;
  if (!data || typeof data !== "object") return null;

  const record = data as DepositJSON & { account?: { type?: string } };
  const accountType = record.account?.type?.toLowerCase();
  const topType =
    typeof (data as { type?: unknown }).type === "string"
      ? String((data as { type?: string }).type).toLowerCase()
      : "";

  const isDeposit =
    accountType === "deposit" ||
    topType === "deposit";

  // Some sandbox payloads omit type but still return deposit account JSON
  const looksLikeDepositWithoutType =
    !accountType &&
    !topType &&
    Array.isArray(record.account?.transactions?.transaction);

  if (!isDeposit && !looksLikeDepositWithoutType) {
    return null;
  }

  return record;
}

export function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

export function normalizeTxnType(
  value: string | undefined,
): "DEBIT" | "CREDIT" | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === "DEBIT" || upper === "DR" || upper === "D") return "DEBIT";
  if (upper === "CREDIT" || upper === "CR" || upper === "C") return "CREDIT";
  return null;
}

export function deterministicTxnId(parts: {
  date: string;
  amount: number;
  narration?: string;
  type: string;
}): string {
  const payload = [
    parts.date,
    String(parts.amount),
    parts.narration ?? "",
    parts.type,
  ].join("|");
  return `hash_${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`;
}

/** Mask consent/session IDs for UI/logs */
export function maskId(id: string): string {
  if (id.length <= 8) return "****";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/** Mask mobile number for logs (show first 2 and last 2 digits) */
function maskMobileNumber(mobile: string): string {
  if (mobile.length <= 4) return "****";
  return `${mobile.slice(0, 2)}****${mobile.slice(-2)}`;
}

export { maskMobileNumber };
