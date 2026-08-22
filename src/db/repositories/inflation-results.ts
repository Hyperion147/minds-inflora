/**
 * Inflation Results repository — database operations for inflation_results table.
 * Server-side only.
 */

import { eq, and, between, desc } from "drizzle-orm";
import { db } from "../index";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "../schema";
import {
  inflationResults,
  inflationDrivers,
  type InsertInflationResult,
  type SelectInflationResult,
  type InsertInflationDriver,
  type SelectInflationDriver,
} from "../schema";
import type { InfloraResult } from "@/lib/inflation/types";

export async function createInflationResult(
  data: Omit<InsertInflationResult, "id" | "createdAt">,
): Promise<SelectInflationResult> {
  const result = await db.insert(inflationResults).values(data).returning();
  return result[0]!;
}

export async function getInflationResultById(
  id: string,
): Promise<SelectInflationResult | undefined> {
  const result = await db
    .select()
    .from(inflationResults)
    .where(eq(inflationResults.id, id))
    .limit(1);
  return result[0];
}

export async function getLatestInflationResult(
  userId: string,
): Promise<SelectInflationResult | undefined> {
  const result = await db
    .select()
    .from(inflationResults)
    .where(eq(inflationResults.userId, userId))
    .orderBy(desc(inflationResults.createdAt))
    .limit(1);
  return result[0];
}

export async function getInflationResults(
  userId: string,
  limit = 10,
): Promise<SelectInflationResult[]> {
  return db
    .select()
    .from(inflationResults)
    .where(eq(inflationResults.userId, userId))
    .orderBy(desc(inflationResults.createdAt))
    .limit(limit);
}

export async function getInflationResultsByDateRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<SelectInflationResult[]> {
  return db
    .select()
    .from(inflationResults)
    .where(
      and(
        eq(inflationResults.userId, userId),
        between(inflationResults.createdAt, from, to),
      ),
    )
    .orderBy(desc(inflationResults.createdAt));
}

export async function createInflationDrivers(
  drivers: Array<Omit<InsertInflationDriver, "id" | "createdAt">>,
): Promise<SelectInflationDriver[]> {
  if (drivers.length === 0) return [];
  return db.insert(inflationDrivers).values(drivers).returning();
}

export async function getDriversForInflationResult(
  inflationResultId: string,
): Promise<SelectInflationDriver[]> {
  return db
    .select()
    .from(inflationDrivers)
    .where(eq(inflationDrivers.inflationResultId, inflationResultId))
    .orderBy(inflationDrivers.rank);
}

/**
 * Save a complete inflation analysis result with its drivers in a transaction.
 */
export async function saveInflationAnalysis(
  userId: string,
  result: InfloraResult,
  periodFrom: Date,
  periodTo: Date,
): Promise<{
  result: SelectInflationResult;
  drivers: SelectInflationDriver[];
}> {
  // Use a transaction to ensure atomicity
  type Tx = PgTransaction<
    PostgresJsQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >;
  const saved = await db.transaction(async (tx: Tx) => {
    // Insert inflation result
    const inflationResultData: Omit<InsertInflationResult, "id" | "createdAt"> = {
      userId,
      periodFrom,
      periodTo,
      eligibleSpend: String(result.totalEligibleSpend),
      personalInflation: String(result.personalInflation),
      headlineCpi: String(result.headlineInflation),
      difference: String(result.differenceFromHeadline),
      uncategorizedAmount: String(result.uncategorizedSpend),
      transactionCount: result.transactionCount,
    };

    const inflationResultRecord = await tx
      .insert(inflationResults)
      .values(inflationResultData)
      .returning();

    const inflationResultId = inflationResultRecord[0]!.id;

    // Insert top drivers
    const driverData: Array<Omit<InsertInflationDriver, "id" | "createdAt">> =
      result.topDrivers.map((driver, index) => ({
        inflationResultId,
        category: driver.categoryId,
        contributionPercentagePoints: String(driver.contributionPercentagePoints),
        rank: index + 1,
      }));

    const savedDrivers =
      driverData.length > 0
        ? await tx.insert(inflationDrivers).values(driverData).returning()
        : [];

    return {
      result: inflationResultRecord[0]!,
      drivers: savedDrivers,
    };
  });

  return saved;
}

/**
 * Get inflation result with its drivers.
 */
export async function getInflationResultWithDrivers(
  id: string,
): Promise<{
  result: SelectInflationResult;
  drivers: SelectInflationDriver[];
} | null> {
  const result = await getInflationResultById(id);
  if (!result) return null;

  const drivers = await getDriversForInflationResult(id);
  return { result, drivers };
}
