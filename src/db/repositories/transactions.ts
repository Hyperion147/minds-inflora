/**
 * Transaction repository — database operations for transactions table.
 * Server-side only.
 */

import { eq, and, between, desc, sql } from "drizzle-orm";
import { db } from "../index";
import {
  transactions,
  type InsertTransaction,
  type SelectTransaction,
} from "../schema";
import type { EngineTransactionInput } from "@/lib/inflation/types";
import { createHash } from "crypto";

export async function insertTransaction(
  data: Omit<InsertTransaction, "id" | "createdAt" | "updatedAt">,
): Promise<SelectTransaction> {
  const result = await db.insert(transactions).values(data).returning();
  return result[0]!;
}

export async function insertTransactions(
  data: Array<Omit<InsertTransaction, "id" | "createdAt" | "updatedAt">>,
): Promise<SelectTransaction[]> {
  if (data.length === 0) return [];
  return db.insert(transactions).values(data).returning();
}

export async function getTransactionByProviderId(
  userId: string,
  providerTransactionId: string,
): Promise<SelectTransaction | undefined> {
  const result = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.providerTransactionId, providerTransactionId),
      ),
    )
    .limit(1);
  return result[0];
}

export async function getTransactionsByUser(
  userId: string,
  limit = 100,
): Promise<SelectTransaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function getTransactionsByUserAndDateRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<SelectTransaction[]> {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        between(transactions.transactionDate, from, to),
      ),
    )
    .orderBy(desc(transactions.transactionDate));
}

export async function getTransactionsByAccount(
  financialAccountId: string,
  limit = 100,
): Promise<SelectTransaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.financialAccountId, financialAccountId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function getRecentTransactions(
  userId: string,
  limit = 10,
): Promise<SelectTransaction[]> {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function getTransactionCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return result[0]?.count ?? 0;
}

export type SaveTransactionsResult = {
  inserted: number;
  skipped: number;
  total: number;
};

/**
 * Save normalized transactions from AA provider to database.
 * Automatically deduplicates based on providerTransactionId.
 */
export async function saveNormalizedTransactions(
  userId: string,
  financialAccountId: string | null,
  source: string,
  engineTransactions: EngineTransactionInput[],
): Promise<SaveTransactionsResult> {
  if (engineTransactions.length === 0) {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  // Build a map of existing transactions by provider ID
  const providerIds = engineTransactions
    .map((t) => t.id)
    .filter((id) => id && !id.startsWith("hash_"));

  const existingMap = new Map<string, boolean>();
  if (providerIds.length > 0) {
    const existing = await db
      .select({ providerTransactionId: transactions.providerTransactionId })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    existing.forEach((row: { providerTransactionId: string | null }) => {
      if (row.providerTransactionId) {
        existingMap.set(row.providerTransactionId, true);
      }
    });
  }

  // Filter out duplicates
  const toInsert: Array<
    Omit<InsertTransaction, "id" | "createdAt" | "updatedAt">
  > = [];
  let skipped = 0;

  for (const txn of engineTransactions) {
    const providerTxnId = txn.id && !txn.id.startsWith("hash_") ? txn.id : null;

    // Skip if we've already seen this provider transaction ID
    if (providerTxnId && existingMap.has(providerTxnId)) {
      skipped++;
      continue;
    }

    // Convert engine transaction to database format
    toInsert.push({
      userId,
      financialAccountId,
      providerTransactionId: providerTxnId,
      transactionDate: new Date(txn.date),
      valueDate: null,
      amount: String(txn.amount),
      currency: txn.currency,
      type: txn.type,
      description: txn.description ?? null,
      merchant: txn.merchant ?? null,
      reference: null,
      category: null,
      subcategory: null,
      source,
    });
  }

  // Insert new transactions
  const inserted = toInsert.length > 0 ? await insertTransactions(toInsert) : [];

  return {
    inserted: inserted.length,
    skipped,
    total: engineTransactions.length,
  };
}

/**
 * Convert database transaction to engine input format.
 */
export function toEngineTransactionInput(
  txn: SelectTransaction,
): EngineTransactionInput {
  return {
    id: txn.providerTransactionId ?? txn.id,
    date: txn.transactionDate.toISOString(),
    merchant: txn.merchant ?? undefined,
    description: txn.description ?? undefined,
    amount: Number(txn.amount),
    currency: txn.currency,
    type: txn.type,
  };
}

/**
 * Convert multiple database transactions to engine input format.
 */
export function toEngineTransactionInputs(
  txns: SelectTransaction[],
): EngineTransactionInput[] {
  return txns.map(toEngineTransactionInput);
}

/**
 * Generate deterministic transaction fingerprint for deduplication.
 */
export function generateTransactionFingerprint(
  userId: string,
  transactionDate: string,
  amount: number,
  type: string,
  description?: string,
  reference?: string,
): string {
  const payload = [
    userId,
    transactionDate,
    String(amount),
    type,
    description ?? "",
    reference ?? "",
  ].join("|");
  return `fp_${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`;
}
