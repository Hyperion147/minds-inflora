/**
 * User repository — database operations for users table.
 * Server-side only.
 */

import { eq } from "drizzle-orm";
import { db } from "../index";
import { users, type InsertUser, type SelectUser } from "../schema";

export async function getUserById(id: string): Promise<SelectUser | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByExternalId(
  externalId: string,
): Promise<SelectUser | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.externalId, externalId))
    .limit(1);
  return result[0];
}

export async function createUser(
  data: Omit<InsertUser, "id" | "createdAt" | "updatedAt">,
): Promise<SelectUser> {
  const result = await db.insert(users).values(data).returning();
  return result[0]!;
}

export async function updateUser(
  id: string,
  data: Partial<Omit<InsertUser, "id" | "createdAt">>,
): Promise<SelectUser | undefined> {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}
