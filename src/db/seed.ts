/**
 * Development seed data for INFLORA database.
 * 
 * Run with: npx tsx src/db/seed.ts
 * 
 * IMPORTANT: Uses synthetic data only. Do not seed real financial information.
 */

import { createUser } from "./repositories/users";
import { createAAConnection } from "./repositories/aa-connections";
import { createAAConsent } from "./repositories/aa-consents";
import { createAASession } from "./repositories/aa-sessions";
import { upsertFinancialAccount } from "./repositories/financial-accounts";
import { insertTransactions } from "./repositories/transactions";
import { saveInflationAnalysis } from "./repositories/inflation-results";

async function seed() {
  console.log("🌱 Seeding INFLORA database...");

  try {
    // Create test user
    const user = await createUser({
      externalId: "test_user_001",
    });
    console.log("✓ Created user:", user.id);

    // Create AA connection
    const connection = await createAAConnection({
      userId: user.id,
      provider: "mock",
      status: "ACTIVE",
    });
    console.log("✓ Created AA connection:", connection.id);

    // Create AA consent
    const consent = await createAAConsent({
      connectionId: connection.id,
      providerConsentId: "mock_consent_001",
      status: "ACTIVE",
      consentUrl: "http://localhost:3000/aa/mock-consent?consentId=mock_consent_001",
      purpose: "Personal Finance Analysis",
      fiTypes: ["DEPOSIT"],
      consentTypes: ["TRANSACTIONS"],
      dataFrom: new Date("2024-02-01"),
      dataTo: new Date("2024-08-01"),
    });
    console.log("✓ Created AA consent:", consent.id);

    // Create AA session
    const session = await createAASession({
      consentId: consent.id,
      providerSessionId: "mock_session_001",
      status: "COMPLETED",
      dataFrom: new Date("2024-02-01"),
      dataTo: new Date("2024-08-01"),
      format: "json",
    });
    console.log("✓ Created AA session:", session.id);

    // Create financial account
    const account = await upsertFinancialAccount({
      userId: user.id,
      aaConnectionId: connection.id,
      providerAccountId: "mock_account_001",
      fipId: "MOCK-BANK-001",
      maskedAccountNumber: "XXXX1234",
      accountType: "DEPOSIT",
      bankName: "Mock Bank",
      currency: "INR",
    });
    console.log("✓ Created financial account:", account.id);

    // Create sample transactions
    const today = new Date();
    const sampleTransactions = [
      {
        userId: user.id,
        financialAccountId: account.id,
        providerTransactionId: "txn_001",
        transactionDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        valueDate: null,
        amount: "250.00",
        currency: "INR",
        type: "DEBIT" as const,
        description: "Swiggy Order",
        merchant: "Swiggy",
        reference: null,
        category: "food_beverages",
        subcategory: null,
        source: "mock",
      },
      {
        userId: user.id,
        financialAccountId: account.id,
        providerTransactionId: "txn_002",
        transactionDate: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000),
        valueDate: null,
        amount: "1200.00",
        currency: "INR",
        type: "DEBIT" as const,
        description: "Grocery Shopping",
        merchant: "Big Bazaar",
        reference: null,
        category: "food_beverages",
        subcategory: null,
        source: "mock",
      },
      {
        userId: user.id,
        financialAccountId: account.id,
        providerTransactionId: "txn_003",
        transactionDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
        valueDate: null,
        amount: "500.00",
        currency: "INR",
        type: "DEBIT" as const,
        description: "Uber Ride",
        merchant: "Uber",
        reference: null,
        category: "transport",
        subcategory: null,
        source: "mock",
      },
      {
        userId: user.id,
        financialAccountId: account.id,
        providerTransactionId: "txn_004",
        transactionDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
        valueDate: null,
        amount: "800.00",
        currency: "INR",
        type: "DEBIT" as const,
        description: "Pharmacy",
        merchant: "Apollo Pharmacy",
        reference: null,
        category: "healthcare",
        subcategory: null,
        source: "mock",
      },
      {
        userId: user.id,
        financialAccountId: account.id,
        providerTransactionId: "txn_005",
        transactionDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        valueDate: null,
        amount: "45000.00",
        currency: "INR",
        type: "CREDIT" as const,
        description: "Salary Credit",
        merchant: null,
        reference: null,
        category: null,
        subcategory: null,
        source: "mock",
      },
    ];

    const txns = await insertTransactions(sampleTransactions);
    console.log(`✓ Created ${txns.length} transactions`);

    // Create sample inflation result
    const periodFrom = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const periodTo = today;

    const inflationAnalysis = await saveInflationAnalysis(
      user.id,
      {
        referenceMonth: "2024-07",
        totalEligibleSpend: 2750.0,
        personalInflation: 6.23,
        headlineInflation: 4.45,
        differenceFromHeadline: 1.78,
        direction: "ABOVE" as const,
        categories: [],
        topDrivers: [
          {
            categoryId: "food_beverages",
            categoryName: "Food & Beverages",
            spendingAmount: 1450.0,
            spendingWeight: 0.53,
            cpiInflation: 7.52,
            contributionPercentagePoints: 3.99,
            per100Impact: 3.99,
          },
          {
            categoryId: "transport",
            categoryName: "Transport",
            spendingAmount: 500.0,
            spendingWeight: 0.18,
            cpiInflation: 5.87,
            contributionPercentagePoints: 1.06,
            per100Impact: 1.06,
          },
          {
            categoryId: "healthcare",
            categoryName: "Health",
            spendingAmount: 800.0,
            spendingWeight: 0.29,
            cpiInflation: 4.21,
            contributionPercentagePoints: 1.22,
            per100Impact: 1.22,
          },
        ],
        uncategorizedSpend: 0.0,
        uncategorizedPercentage: 0.0,
        excludedCount: 1,
        eligibleCount: 4,
        transactionCount: 5,
      },
      periodFrom,
      periodTo,
    );
    console.log("✓ Created inflation result:", inflationAnalysis.result.id);
    console.log(`✓ Created ${inflationAnalysis.drivers.length} inflation drivers`);

    console.log("\n✅ Seed completed successfully!");
    console.log("\nTest User ID:", user.id);
    console.log("Use this ID for testing user-scoped queries.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
