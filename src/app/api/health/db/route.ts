import { NextResponse } from "next/server";
import { testDatabaseConnection } from "@/db";

/**
 * GET /api/health/db
 * Database health check — tests Supabase PostgreSQL connection.
 */
export async function GET() {
  try {
    const isConnected = await testDatabaseConnection();

    if (isConnected) {
      return NextResponse.json({
        database: "connected",
        status: "healthy",
      });
    }

    return NextResponse.json(
      {
        database: "disconnected",
        status: "unhealthy",
        error: "Database connection test failed",
      },
      { status: 503 },
    );
  } catch (error) {
    console.error("[health/db]", error);
    return NextResponse.json(
      {
        database: "error",
        status: "unhealthy",
        error:
          error instanceof Error
            ? error.message
            : "Database health check failed",
      },
      { status: 503 },
    );
  }
}
