/**
 * AA Session repository — database operations for aa_sessions table.
 * Server-side only.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import {
  aaSessions,
  type InsertAASession,
  type SelectAASession,
} from "../schema";

export async function createAASession(
  data: Omit<InsertAASession, "id" | "createdAt" | "updatedAt">,
): Promise<SelectAASession> {
  const result = await db.insert(aaSessions).values(data).returning();
  return result[0]!;
}

export async function getSessionById(
  id: string,
): Promise<SelectAASession | undefined> {
  const result = await db
    .select()
    .from(aaSessions)
    .where(eq(aaSessions.id, id))
    .limit(1);
  return result[0];
}

export async function getSessionByProviderId(
  providerSessionId: string,
): Promise<SelectAASession | undefined> {
  const result = await db
    .select()
    .from(aaSessions)
    .where(eq(aaSessions.providerSessionId, providerSessionId))
    .limit(1);
  return result[0];
}

export async function updateSessionStatus(
  id: string,
  status: string,
): Promise<SelectAASession | undefined> {
  const result = await db
    .update(aaSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(aaSessions.id, id))
    .returning();
  return result[0];
}

export async function getLatestSessionForConsent(
  consentId: string,
): Promise<SelectAASession | undefined> {
  const result = await db
    .select()
    .from(aaSessions)
    .where(eq(aaSessions.consentId, consentId))
    .orderBy(desc(aaSessions.createdAt))
    .limit(1);
  return result[0];
}

export async function getSessionsByConsent(
  consentId: string,
): Promise<SelectAASession[]> {
  return db
    .select()
    .from(aaSessions)
    .where(eq(aaSessions.consentId, consentId))
    .orderBy(desc(aaSessions.createdAt));
}
