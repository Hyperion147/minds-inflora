import { normalizeMerchantName } from "./normalizeTransactions";
import type {
  AppCategoryId,
  CategorizationMethod,
  CategorizedTransaction,
  CategoryConfidence,
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
  const catalog = buildMerchantCatalog(mapping);

  return transactions.map((txn) => {
    if (!txn.eligible) {
      return withDecision(txn, uncategorizedDecision());
    }

    const decision =
      matchExactMerchant(txn.merchantNormalized, catalog) ??
      matchMerchantAlias(txn.merchantNormalized, catalog) ??
      matchStructuredDescription(txn.description, catalog) ??
      matchDescriptionPhrase(txn.description, catalog) ??
      uncategorizedDecision();

    return withDecision(txn, decision);
  });
}

export function resolveMerchantCategory(
  merchant: string | undefined,
  mapping: MerchantCategoryMapping,
): AppCategoryId {
  const catalog = buildMerchantCatalog(mapping);
  return catalog.matchPhrase(normalizeMerchantName(merchant)) ?? UNCATEGORIZED;
}

type MerchantMatcher = (normalizedMerchant: string) => AppCategoryId | null;
type MerchantCatalog = {
  exact: Map<string, AppCategoryId>;
  matchPhrase: MerchantMatcher;
};

type CategorizationDecision = {
  categoryId: AppCategoryId;
  categoryConfidence: CategoryConfidence;
  categorizationMethod: CategorizationMethod;
  categorizationSource: string | null;
};

function buildMerchantCatalog(
  mapping: MerchantCategoryMapping,
): MerchantCatalog {
  const entries = Object.entries(mapping)
    .map(([key, category]) => [normalizeMerchantName(key), category] as const)
    .filter(([key]) => key.length > 0)
    .sort((a, b) => b[0].length - a[0].length);

  const exact = new Map(entries);

  return {
    exact,
    matchPhrase: (normalizedMerchant: string): AppCategoryId | null => {
      if (!normalizedMerchant) return null;

      const direct = exact.get(normalizedMerchant);
      if (direct) return direct;

      for (const [key, category] of entries) {
        if (containsAsPhrase(normalizedMerchant, key)) {
          return category;
        }
      }

      return null;
    },
  };
}

function matchExactMerchant(
  merchantNormalized: string,
  catalog: MerchantCatalog,
): CategorizationDecision | null {
  const normalized = normalizeMerchantName(merchantNormalized);
  if (!normalized) {
    return null;
  }

  const categoryId = catalog.exact.get(normalized);
  if (!categoryId) {
    return null;
  }

  return {
    categoryId,
    categoryConfidence: "HIGH",
    categorizationMethod: "exact_merchant",
    categorizationSource: normalized,
  };
}

function matchMerchantAlias(
  merchantNormalized: string,
  catalog: MerchantCatalog,
): CategorizationDecision | null {
  for (const alias of generateMerchantAliases(merchantNormalized)) {
    const categoryId = catalog.exact.get(alias);
    if (categoryId) {
      return {
        categoryId,
        categoryConfidence: "HIGH",
        categorizationMethod: "merchant_alias",
        categorizationSource: alias,
      };
    }
  }

  return null;
}

function generateMerchantAliases(value: string): string[] {
  const normalized = normalizeMerchantName(value);
  if (!normalized) {
    return [];
  }

  const aliases = new Set<string>();
  const explicitAlias = EXPLICIT_MERCHANT_ALIASES.get(normalized);
  if (explicitAlias) {
    aliases.add(explicitAlias);
  }

  const withoutNoise = normalized
    .split(" ")
    .filter((part) => !ALIAS_NOISE_TOKENS.has(part))
    .join(" ")
    .trim();
  if (withoutNoise && withoutNoise !== normalized) {
    aliases.add(withoutNoise);
  }

  const withoutTrailingNoise = normalized.replace(
    /\b(?:txn|transaction|payment|payments|purchase|store|online)\b$/u,
    "",
  ).trim();
  if (withoutTrailingNoise && withoutTrailingNoise !== normalized) {
    aliases.add(withoutTrailingNoise);
  }

  return [...aliases];
}

function matchStructuredDescription(
  description: string | undefined,
  catalog: MerchantCatalog,
): CategorizationDecision | null {
  if (!description?.includes("/")) {
    return null;
  }

  for (const segment of extractStructuredDescriptionSegments(description)) {
    const exact = catalog.exact.get(segment);
    if (exact) {
      return {
        categoryId: exact,
        categoryConfidence: "MEDIUM",
        categorizationMethod: "structured_narration",
        categorizationSource: segment,
      };
    }

    for (const alias of generateMerchantAliases(segment)) {
      const categoryId = catalog.exact.get(alias);
      if (categoryId) {
        return {
          categoryId,
          categoryConfidence: "MEDIUM",
          categorizationMethod: "structured_narration",
          categorizationSource: alias,
        };
      }
    }
  }

  return null;
}

function matchDescriptionPhrase(
  description: string | undefined,
  catalog: MerchantCatalog,
): CategorizationDecision | null {
  const normalizedDescription = normalizeMerchantName(description);
  if (!normalizedDescription) {
    return null;
  }

  const categoryId = catalog.matchPhrase(normalizedDescription);
  if (!categoryId) {
    return null;
  }

  return {
    categoryId,
    categoryConfidence: "LOW",
    categorizationMethod: "description_phrase",
    categorizationSource: normalizedDescription,
  };
}

function extractStructuredDescriptionSegments(description: string): string[] {
  return description
    .split("/")
    .map((part) => normalizeMerchantName(part))
    .filter((part) => {
      if (!part) return false;
      if (STRUCTURED_NOISE_TOKENS.has(part)) return false;
      if (/^\d+$/.test(part.replace(/\s+/g, ""))) return false;
      if (/^[a-z]{1,4}$/.test(part)) return false;
      return true;
    });
}

const STRUCTURED_NOISE_TOKENS = new Set([
  "atm",
  "cash",
  "card",
  "ft",
  "de",
  "dr",
  "cr",
]);

const ALIAS_NOISE_TOKENS = new Set([
  "in",
  "online",
  "store",
  "txn",
  "transaction",
  "payment",
  "payments",
  "purchase",
]);

const EXPLICIT_MERCHANT_ALIASES = new Map([
  ["swiggy in", "swiggy"],
  ["swiggy india", "swiggy"],
  ["uber india", "uber"],
  ["amazon india", "amazon"],
  ["flipkart india", "flipkart"],
]);

function withDecision(
  txn: EligibleTransaction,
  decision: CategorizationDecision,
): CategorizedTransaction {
  return {
    ...txn,
    categoryId: decision.categoryId,
    categoryConfidence: decision.categoryConfidence,
    categorizationMethod: decision.categorizationMethod,
    categorizationSource: decision.categorizationSource,
  };
}

function uncategorizedDecision(): CategorizationDecision {
  return {
    categoryId: UNCATEGORIZED,
    categoryConfidence: "NONE",
    categorizationMethod: "uncategorized",
    categorizationSource: null,
  };
}

/** True when `key` appears as a contiguous word-boundary phrase inside `text`. */
function containsAsPhrase(text: string, key: string): boolean {
  if (text === key) return true;
  if (text.startsWith(`${key} `) || text.endsWith(` ${key}`)) return true;
  if (text.includes(` ${key} `)) return true;
  return false;
}
