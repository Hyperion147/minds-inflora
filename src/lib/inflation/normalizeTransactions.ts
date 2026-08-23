import type {
  EligibilityReason,
  EligibleTransaction,
  EngineTransactionInput,
  NormalizedTransaction,
  TransactionType,
} from "./types";

const SUPPORTED_CURRENCIES = new Set(["INR", "RS", "₹"]);

const CORPORATE_SUFFIXES = [
  "private limited",
  "pvt ltd",
  "pvt. ltd.",
  "pvt.ltd",
  "ltd",
  "limited",
  "inc",
  "llc",
  "india pvt ltd",
];

/**
 * Normalize merchant / narration text for deterministic matching.
 * Lowercase, strip punctuation, collapse whitespace, drop common legal suffixes.
 */
export function normalizeMerchantName(value: string | undefined | null): string {
  if (!value) return "";

  let text = value.toLowerCase().normalize("NFKD");
  text = text.replace(/[^\p{L}\p{N}\s]/gu, " ");
  text = text.replace(/\s+/g, " ").trim();

  for (const suffix of CORPORATE_SUFFIXES) {
    if (text.endsWith(` ${suffix}`)) {
      text = text.slice(0, -(suffix.length + 1)).trim();
    } else if (text === suffix) {
      text = "";
    }
  }

  // Trailing country token often appears as "Swiggy India"
  if (text.endsWith(" india") && text !== "air india" && text !== "indian oil") {
    text = text.slice(0, -6).trim();
  }

  return text;
}

export function normalizeTransactions(
  inputs: EngineTransactionInput[],
): NormalizedTransaction[] {
  const seen = new Set<string>();
  const result: NormalizedTransaction[] = [];

  for (const raw of inputs) {
    if (!raw?.id || seen.has(raw.id)) {
      continue;
    }
    seen.add(raw.id);

    const type = normalizeType(raw.type);
    if (!type) continue;

    const amount = Number(raw.amount);
    const merchantRaw = (raw.merchant ?? "").trim();
    const description = (raw.description ?? "").trim();

    result.push({
      id: raw.id,
      date: raw.date || "",
      merchantRaw,
      merchantNormalized: normalizeMerchantName(
        merchantRaw || description || undefined,
      ),
      description,
      amount,
      currency: (raw.currency ?? "").trim().toUpperCase(),
      type,
    });
  }

  return result;
}

function normalizeType(type: unknown): TransactionType | null {
  if (type === "DEBIT" || type === "CREDIT") return type;
  if (typeof type === "string") {
    const upper = type.toUpperCase();
    if (upper === "DEBIT" || upper === "CREDIT") return upper;
  }
  return null;
}

/**
 * Mark consumer-spending eligibility. Only eligible DEBITs feed personal inflation.
 * Does not blindly drop generic UPI transfers — only identifiable non-consumption flows.
 */
export function assessEligibility(
  txns: NormalizedTransaction[],
): EligibleTransaction[] {
  return txns.map((txn) => {
    const reason = classifyEligibility(txn);
    return {
      ...txn,
      eligible: reason === "eligible",
      exclusionReason: reason,
    };
  });
}

export function classifyEligibility(
  txn: NormalizedTransaction,
): EligibilityReason {
  if (!Number.isFinite(txn.amount) || txn.amount <= 0) {
    return "invalid_amount";
  }

  if (txn.type === "CREDIT") {
    return "credit";
  }

  if (!SUPPORTED_CURRENCIES.has(txn.currency)) {
    return "unknown_currency";
  }

  const haystack = `${txn.merchantNormalized} ${normalizeMerchantName(txn.description)}`;
  const structuredChannel = getStructuredSandboxChannel(txn.description);

  if (matchesAny(haystack, INCOME_PATTERNS)) return "income";
  if (matchesAny(haystack, REFUND_PATTERNS)) return "refund";
  if (matchesAny(haystack, OWN_TRANSFER_PATTERNS)) return "own_account_transfer";
  if (matchesAny(haystack, LOAN_PATTERNS)) return "loan_disbursal";
  if (matchesAny(haystack, INVESTMENT_PATTERNS)) return "investment";
  if (matchesAny(haystack, CC_PAYMENT_PATTERNS)) return "credit_card_payment";
  if (
    structuredChannel === "ATM" ||
    structuredChannel === "CASH" ||
    structuredChannel === "FT"
  ) {
    return "non_consumption";
  }
  if (matchesAny(haystack, OTHER_NON_CONSUMPTION)) return "non_consumption";

  return "eligible";
}

function getStructuredSandboxChannel(description: string): string | null {
  if (!description || !description.includes("/")) {
    return null;
  }

  const [first, second] = description
    .split("/")
    .map((segment) => segment.trim().toUpperCase());

  if (!first || !second) {
    return null;
  }

  if ((second === "DE" || second === "DR" || second === "CR") && /^[A-Z]+$/.test(first)) {
    return first;
  }

  return null;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

const INCOME_PATTERNS = [
  /\bsalary\b/,
  /\bpayroll\b/,
  /\bincome\b/,
  /\bwages?\b/,
  /\bstipend\b/,
  /\bfreelance payout\b/,
  /\bemployer\b/,
];

const REFUND_PATTERNS = [
  /\brefund\b/,
  /\bcashback\b/,
  /\breversal\b/,
  /\bchargeback\b/,
];

const OWN_TRANSFER_PATTERNS = [
  /\bself transfer\b/,
  /\bto self\b/,
  /\bown account\b/,
  /\bown acct\b/,
  /\baccount to account\b/,
  /\ba2a transfer\b/,
  /\binternal transfer\b/,
  /\bfund transfer to self\b/,
  /\btransfer to self\b/,
];

const LOAN_PATTERNS = [
  /\bloan disburs\w*\b/,
  /\bdisbursal\b/,
  /\bdisbursement\b/,
  /\bpersonal loan credit\b/,
];

const INVESTMENT_PATTERNS = [
  /\bmutual fund\b/,
  /\bsip\b/,
  /\binvestment\b/,
  /\bbrokerage\b/,
  /\bdemat\b/,
  /\bstock purchase\b/,
  /\bnps contribution\b/,
  /\bppf\b/,
];

const CC_PAYMENT_PATTERNS = [
  /\bcredit card bill\b/,
  /\bcredit card payment\b/,
  /\bcc payment\b/,
  /\bcc bill\b/,
  /\bcard bill payment\b/,
];

const OTHER_NON_CONSUMPTION = [
  /\bemandate registration\b/,
  /\bbank charges reversal\b/,
];
