/**
 * Financial Account repository — database operations for financial_accounts table.
 * Server-side only.
 */

import { eq, and } from "drizzle-orm";
import { db } from "../index";
import {
  financialAccounts,
  type InsertFinancialAccount,
  type SelectFinancialAccount,
} from "../schema";

export async function upsertFinancialAccount(
  data: Omit<InsertFinancialAccount, "id" | "createdAt" | "updatedAt">,
): Promise<SelectFinancialAccount> {
  // Try to find existing account by provider ID
  if (data.providerAccountId) {
    const existing = await db
      .select()
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.userId, data.userId),
          eq(financialAccounts.providerAccountId, data.providerAccountId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      // Update existing account
      const updated = await db
        .update(financialAccounts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(financialAccounts.id, existing[0].id))
        .returning();
      return updated[0]!;
    }
  }

  // Create new account
  const result = await db.insert(financialAccounts).values(data).returning();
  return result[0]!;
}

export async function getFinancialAccountsByUser(
  userId: string,
): Promise<SelectFinancialAccount[]> {
  return db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId));
}

export async function getFinancialAccountById(
  id: string,
): Promise<SelectFinancialAccount | undefined> {
  const result = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, id))
    .limit(1);
  return result[0];
}

export async function getFinancialAccountByProviderId(
  userId: string,
  providerAccountId: string,
): Promise<SelectFinancialAccount | undefined> {
  const result = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.userId, userId),
        eq(financialAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  return result[0];
}
