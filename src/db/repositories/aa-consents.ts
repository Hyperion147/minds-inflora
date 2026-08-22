/**
 * AA Consent repository — database operations for aa_consents table.
 * Server-side only.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import {
  aaConsents,
  type InsertAAConsent,
  type SelectAAConsent,
} from "../schema";

export async function createAAConsent(
  data: Omit<InsertAAConsent, "id" | "createdAt" | "updatedAt">,
): Promise<SelectAAConsent> {
  const result = await db.insert(aaConsents).values(data).returning();
  return result[0]!;
}

export async function getConsentById(
  id: string,
): Promise<SelectAAConsent | undefined> {
  const result = await db
    .select()
    .from(aaConsents)
    .where(eq(aaConsents.id, id))
    .limit(1);
  return result[0];
}

export async function getConsentByProviderId(
  providerConsentId: string,
): Promise<SelectAAConsent | undefined> {
  const result = await db
    .select()
    .from(aaConsents)
    .where(eq(aaConsents.providerConsentId, providerConsentId))
    .limit(1);
  return result[0];
}

export async function updateConsentStatus(
  id: string,
  status: string,
): Promise<SelectAAConsent | undefined> {
  const result = await db
    .update(aaConsents)
    .set({ status, updatedAt: new Date() })
    .where(eq(aaConsents.id, id))
    .returning();
  return result[0];
}

export async function updateConsent(
  id: string,
  data: Partial<Omit<InsertAAConsent, "id" | "connectionId" | "createdAt">>,
): Promise<SelectAAConsent | undefined> {
  const result = await db
    .update(aaConsents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(aaConsents.id, id))
    .returning();
  return result[0];
}

export async function getLatestConsentForConnection(
  connectionId: string,
): Promise<SelectAAConsent | undefined> {
  const result = await db
    .select()
    .from(aaConsents)
    .where(eq(aaConsents.connectionId, connectionId))
    .orderBy(desc(aaConsents.createdAt))
    .limit(1);
  return result[0];
}

export async function getConsentsByConnection(
  connectionId: string,
): Promise<SelectAAConsent[]> {
  return db
    .select()
    .from(aaConsents)
    .where(eq(aaConsents.connectionId, connectionId))
    .orderBy(desc(aaConsents.createdAt));
}
