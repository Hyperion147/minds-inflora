/**
 * AA Connection repository — database operations for aa_connections table.
 * Server-side only.
 */

import { eq, and } from "drizzle-orm";
import { db } from "../index";
import {
  aaConnections,
  type InsertAAConnection,
  type SelectAAConnection,
} from "../schema";

export async function createAAConnection(
  data: Omit<InsertAAConnection, "id" | "createdAt" | "updatedAt">,
): Promise<SelectAAConnection> {
  const result = await db.insert(aaConnections).values(data).returning();
  return result[0]!;
}

export async function getAAConnectionById(
  id: string,
): Promise<SelectAAConnection | undefined> {
  const result = await db
    .select()
    .from(aaConnections)
    .where(eq(aaConnections.id, id))
    .limit(1);
  return result[0];
}

export async function getAAConnectionsByUser(
  userId: string,
): Promise<SelectAAConnection[]> {
  return db
    .select()
    .from(aaConnections)
    .where(eq(aaConnections.userId, userId));
}

export async function updateAAConnectionStatus(
  id: string,
  status: string,
): Promise<SelectAAConnection | undefined> {
  const result = await db
    .update(aaConnections)
    .set({ status, updatedAt: new Date() })
    .where(eq(aaConnections.id, id))
    .returning();
  return result[0];
}

export async function getLatestAAConnectionForUser(
  userId: string,
  provider?: string,
): Promise<SelectAAConnection | undefined> {
  const conditions = [eq(aaConnections.userId, userId)];
  if (provider) {
    conditions.push(eq(aaConnections.provider, provider));
  }

  const result = await db
    .select()
    .from(aaConnections)
    .where(and(...conditions))
    .orderBy(aaConnections.createdAt)
    .limit(1);

  return result[0];
}
