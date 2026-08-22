/**
 * INFLORA database connection — Supabase PostgreSQL via Drizzle ORM.
 *
 * SERVER-SIDE ONLY.
 * Never import this module into client components.
 *
 * Connection uses postgres.js with prepare: false for Supabase
 * transaction pooler compatibility.
 */

import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DbSchema = typeof schema;

function createDb(): PostgresJsDatabase<DbSchema> & { $client: postgres.Sql } {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Surfaces at runtime; repositories throw descriptively rather than at import time.
    throw new Error(
      "[DB] DATABASE_URL is not configured. " +
        "Add it to .env.local (see README for Supabase setup).",
    );
  }
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema }) as PostgresJsDatabase<DbSchema> & {
    $client: postgres.Sql;
  };
}

/**
 * Lazy singleton — initialised on first use, not at import time.
 * This means the build succeeds without DATABASE_URL.
 */
let _db: (PostgresJsDatabase<DbSchema> & { $client: postgres.Sql }) | null =
  null;

export function getDb(): PostgresJsDatabase<DbSchema> & {
  $client: postgres.Sql;
} {
  if (!_db) _db = createDb();
  return _db;
}

/**
 * Convenience re-export so existing callers can write `db.select()…`
 * by calling getDb() once per module.
 */
export const db = new Proxy(
  {} as PostgresJsDatabase<DbSchema> & { $client: postgres.Sql },
  {
    get(_target, prop) {
      return Reflect.get(getDb(), prop);
    },
  },
);

/** Health check — returns true when the DB is reachable. */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const instance = getDb();
    await instance.$client`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[DB] Connection test failed:", error);
    return false;
  }
}
