/**
 * INFLORA database schema — Supabase PostgreSQL via Drizzle ORM.
 * Server-side only. Never import into client components.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// ENUMS
// =============================================================================

export const transactionTypeEnum = pgEnum("transaction_type", [
  "DEBIT",
  "CREDIT",
]);

// =============================================================================
// USERS
// =============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  externalIdIdx: uniqueIndex("users_external_id_idx").on(table.externalId),
}));

export const usersRelations = relations(users, ({ many }) => ({
  aaConnections: many(aaConnections),
  financialAccounts: many(financialAccounts),
  transactions: many(transactions),
  inflationResults: many(inflationResults),
}));

// =============================================================================
// AA CONNECTIONS
// =============================================================================

export const aaConnections = pgTable("aa_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  userIdIdx: index("aa_connections_user_id_idx").on(table.userId),
}));

export const aaConnectionsRelations = relations(aaConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [aaConnections.userId],
    references: [users.id],
  }),
  consents: many(aaConsents),
  financialAccounts: many(financialAccounts),
}));

// =============================================================================
// AA CONSENTS
// =============================================================================

export const aaConsents = pgTable("aa_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => aaConnections.id, { onDelete: "cascade" }),
  providerConsentId: text("provider_consent_id").notNull(),
  status: text("status").notNull(),
  consentUrl: text("consent_url"),
  purpose: text("purpose"),
  fiTypes: jsonb("fi_types"),
  consentTypes: jsonb("consent_types"),
  dataFrom: timestamp("data_from", { withTimezone: true }),
  dataTo: timestamp("data_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  connectionIdIdx: index("aa_consents_connection_id_idx").on(table.connectionId),
  providerConsentIdIdx: uniqueIndex("aa_consents_provider_consent_id_idx").on(
    table.providerConsentId,
  ),
}));

export const aaConsentsRelations = relations(aaConsents, ({ one, many }) => ({
  connection: one(aaConnections, {
    fields: [aaConsents.connectionId],
    references: [aaConnections.id],
  }),
  sessions: many(aaSessions),
}));

// =============================================================================
// AA SESSIONS
// =============================================================================

export const aaSessions = pgTable("aa_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consentId: uuid("consent_id")
    .notNull()
    .references(() => aaConsents.id, { onDelete: "cascade" }),
  providerSessionId: text("provider_session_id").notNull(),
  status: text("status").notNull(),
  dataFrom: timestamp("data_from", { withTimezone: true }),
  dataTo: timestamp("data_to", { withTimezone: true }),
  format: text("format"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  consentIdIdx: index("aa_sessions_consent_id_idx").on(table.consentId),
  providerSessionIdIdx: uniqueIndex("aa_sessions_provider_session_id_idx").on(
    table.providerSessionId,
  ),
}));

export const aaSessionsRelations = relations(aaSessions, ({ one }) => ({
  consent: one(aaConsents, {
    fields: [aaSessions.consentId],
    references: [aaConsents.id],
  }),
}));

// =============================================================================
// FINANCIAL ACCOUNTS
// =============================================================================

export const financialAccounts = pgTable("financial_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  aaConnectionId: uuid("aa_connection_id").references(() => aaConnections.id, {
    onDelete: "set null",
  }),
  providerAccountId: text("provider_account_id"),
  fipId: text("fip_id"),
  maskedAccountNumber: text("masked_account_number"),
  accountType: text("account_type"),
  bankName: text("bank_name"),
  currency: text("currency").notNull().default("INR"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  userIdIdx: index("financial_accounts_user_id_idx").on(table.userId),
}));

export const financialAccountsRelations = relations(
  financialAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [financialAccounts.userId],
      references: [users.id],
    }),
    aaConnection: one(aaConnections, {
      fields: [financialAccounts.aaConnectionId],
      references: [aaConnections.id],
    }),
    transactions: many(transactions),
  }),
);

// =============================================================================
// TRANSACTIONS
// =============================================================================

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  financialAccountId: uuid("financial_account_id").references(
    () => financialAccounts.id,
    { onDelete: "set null" },
  ),
  providerTransactionId: text("provider_transaction_id"),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  valueDate: timestamp("value_date", { withTimezone: true }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  merchant: text("merchant"),
  reference: text("reference"),
  category: text("category"),
  subcategory: text("subcategory"),
  source: text("source").notNull().default("setu"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  transactionDateIdx: index("transactions_transaction_date_idx").on(
    table.transactionDate,
  ),
  userIdDateIdx: index("transactions_user_id_date_idx").on(
    table.userId,
    table.transactionDate,
  ),
  providerTransactionIdIdx: index("transactions_provider_transaction_id_idx").on(
    table.providerTransactionId,
  ),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  financialAccount: one(financialAccounts, {
    fields: [transactions.financialAccountId],
    references: [financialAccounts.id],
  }),
}));

// =============================================================================
// INFLATION RESULTS
// =============================================================================

export const inflationResults = pgTable("inflation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  periodFrom: timestamp("period_from", { withTimezone: true }),
  periodTo: timestamp("period_to", { withTimezone: true }),
  eligibleSpend: numeric("eligible_spend", { precision: 14, scale: 2 }),
  personalInflation: numeric("personal_inflation", { precision: 8, scale: 4 }),
  headlineCpi: numeric("headline_cpi", { precision: 8, scale: 4 }),
  difference: numeric("difference", { precision: 8, scale: 4 }),
  uncategorizedAmount: numeric("uncategorized_amount", {
    precision: 14,
    scale: 2,
  }),
  transactionCount: integer("transaction_count"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  userIdIdx: index("inflation_results_user_id_idx").on(table.userId),
  userIdCreatedAtIdx: index("inflation_results_user_id_created_at_idx").on(
    table.userId,
    table.createdAt,
  ),
}));

export const inflationResultsRelations = relations(
  inflationResults,
  ({ one, many }) => ({
    user: one(users, {
      fields: [inflationResults.userId],
      references: [users.id],
    }),
    drivers: many(inflationDrivers),
  }),
);

// =============================================================================
// INFLATION DRIVERS
// =============================================================================

export const inflationDrivers = pgTable("inflation_drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  inflationResultId: uuid("inflation_result_id")
    .notNull()
    .references(() => inflationResults.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  contributionPercentagePoints: numeric("contribution_percentage_points", {
    precision: 8,
    scale: 4,
  }).notNull(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  inflationResultIdIdx: index("inflation_drivers_inflation_result_id_idx").on(
    table.inflationResultId,
  ),
}));

export const inflationDriversRelations = relations(inflationDrivers, ({ one }) => ({
  inflationResult: one(inflationResults, {
    fields: [inflationDrivers.inflationResultId],
    references: [inflationResults.id],
  }),
}));

// =============================================================================
// INFERRED TYPES
// =============================================================================

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertAAConnection = typeof aaConnections.$inferInsert;
export type SelectAAConnection = typeof aaConnections.$inferSelect;

export type InsertAAConsent = typeof aaConsents.$inferInsert;
export type SelectAAConsent = typeof aaConsents.$inferSelect;

export type InsertAASession = typeof aaSessions.$inferInsert;
export type SelectAASession = typeof aaSessions.$inferSelect;

export type InsertFinancialAccount = typeof financialAccounts.$inferInsert;
export type SelectFinancialAccount = typeof financialAccounts.$inferSelect;

export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;

export type InsertInflationResult = typeof inflationResults.$inferInsert;
export type SelectInflationResult = typeof inflationResults.$inferSelect;

export type InsertInflationDriver = typeof inflationDrivers.$inferInsert;
export type SelectInflationDriver = typeof inflationDrivers.$inferSelect;
