import { normalizeMerchantName } from "./normalizeTransactions";
import type {
  AppCategoryId,
  CategorizedTransaction,
  EligibleTransaction,
  MerchantCategoryMapping,
} from "./types";
import { UNCATEGORIZED } from "./types";

/**
 * Categorize eligible transactions using synthetic merchant_category_mapping.
 * Unknown merchants → "uncategorized". Never random-guess.
 */
export function categorizeTransactions(
  transactions: EligibleTransaction[],
  mapping: MerchantCategoryMapping,
): CategorizedTransaction[] {
  const matcher = buildMerchantMatcher(mapping);

  return transactions.map((txn) => {
    if (!txn.eligible) {
      return { ...txn, categoryId: UNCATEGORIZED };
    }

    const categoryId =
      matcher(txn.merchantNormalized) ??
      matcher(normalizeMerchantName(txn.description)) ??
      UNCATEGORIZED;

    return { ...txn, categoryId };
  });
}

export function resolveMerchantCategory(
  merchant: string | undefined,
  mapping: MerchantCategoryMapping,
): AppCategoryId {
  const matcher = buildMerchantMatcher(mapping);
  return matcher(normalizeMerchantName(merchant)) ?? UNCATEGORIZED;
}

type MerchantMatcher = (normalizedMerchant: string) => AppCategoryId | null;

function buildMerchantMatcher(
  mapping: MerchantCategoryMapping,
): MerchantMatcher {
  const entries = Object.entries(mapping)
    .map(([key, category]) => [normalizeMerchantName(key), category] as const)
    .filter(([key]) => key.length > 0)
    // Longer keys first so "apollo pharmacy" wins over "pharmacy"
    .sort((a, b) => b[0].length - a[0].length);

  const exact = new Map(entries);

  return (normalizedMerchant: string): AppCategoryId | null => {
    if (!normalizedMerchant) return null;

    const direct = exact.get(normalizedMerchant);
    if (direct) return direct;

    for (const [key, category] of entries) {
      if (containsAsPhrase(normalizedMerchant, key)) {
        return category;
      }
    }

    return null;
  };
}

/** True when `key` appears as a contiguous word-boundary phrase inside `text`. */
function containsAsPhrase(text: string, key: string): boolean {
  if (text === key) return true;
  if (text.startsWith(`${key} `) || text.endsWith(` ${key}`)) return true;
  if (text.includes(` ${key} `)) return true;
  return false;
}
