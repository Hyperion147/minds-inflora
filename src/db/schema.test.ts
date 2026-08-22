/**
 * Database schema type tests.
 * Verifies Drizzle schema is correctly defined without requiring DATABASE_URL.
 */

import { describe, it, expect } from "vitest";
import type {
  InsertUser,
  SelectUser,
  InsertTransaction,
  SelectTransaction,
  InsertInflationResult,
  SelectInflationResult,
} from "./schema";

describe("Database schema types", () => {
  it("exports User insert and select types", () => {
    const insertUser: InsertUser = {
      externalId: "test_user",
    };
    expect(insertUser).toBeDefined();

    const selectUser: Partial<SelectUser> = {
      id: "uuid-here",
      externalId: "test_user",
    };
    expect(selectUser).toBeDefined();
  });

  it("exports Transaction insert and select types", () => {
    const insertTxn: InsertTransaction = {
      userId: "user-id",
      financialAccountId: null,
      providerTransactionId: "txn_001",
      transactionDate: new Date(),
      valueDate: null,
      amount: "100.50",
      currency: "INR",
      type: "DEBIT",
      description: "Test transaction",
      merchant: null,
      reference: null,
      category: null,
      subcategory: null,
      source: "mock",
    };
    expect(insertTxn).toBeDefined();
    expect(insertTxn.type).toBe("DEBIT");

    const selectTxn: Partial<SelectTransaction> = {
      id: "uuid-here",
      amount: "100.50",
      type: "DEBIT",
    };
    expect(selectTxn).toBeDefined();
  });

  it("exports InflationResult insert and select types", () => {
    const insertResult: InsertInflationResult = {
      userId: "user-id",
      periodFrom: new Date(),
      periodTo: new Date(),
      eligibleSpend: "5000.00",
      personalInflation: "6.25",
      headlineCpi: "4.45",
      difference: "1.80",
      uncategorizedAmount: "0.00",
      transactionCount: 10,
    };
    expect(insertResult).toBeDefined();

    const selectResult: Partial<SelectInflationResult> = {
      id: "uuid-here",
      personalInflation: "6.25",
    };
    expect(selectResult).toBeDefined();
  });

  it("enforces transaction type enum", () => {
    const validTypes: Array<InsertTransaction["type"]> = ["DEBIT", "CREDIT"];
    expect(validTypes).toContain("DEBIT");
    expect(validTypes).toContain("CREDIT");
    expect(validTypes.length).toBe(2);
  });
});
