# INFLORA

Hackathon prototype: **Account Aggregator (Setu AA Gateway v2)** → normalized transactions → **personalized inflation engine**.

This is a **sandbox / hackathon prototype**. Production AA access requires Setu onboarding, approval, credentials, and compliance.

## Architecture

```text
User → /aa-test → Next.js API (server only)
                 → Setu AA Gateway v2
                 → Consent → ACTIVE
                 → FI Session → DEPOSIT JSON
                 → normalize → EngineTransactionInput[]
                 → existing calculateInflora() (unchanged)
```

The inflation engine (`src/lib/inflation/`) knows nothing about Setu, tokens, consents, or FIPs.

## Quick start (mock mode)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000/aa-test](http://localhost:3000/aa-test).

1. **Connect Financial Accounts** → mock consent page  
2. **Consent Granted** → status ACTIVE  
3. **Fetch My Financial Data** → polls until COMPLETED  
4. **Calculate My Personal Inflation** → existing engine result  

No Setu credentials required when `AA_PROVIDER=mock`.

Demo inflation without AA: [GET /api/inflation/demo](http://localhost:3000/api/inflation/demo)

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `AA_PROVIDER` | No (default `mock`) | `mock` or `setu` |
| `APP_BASE_URL` | No | App origin |
| `AA_REDIRECT_URI` | Recommended | Post-consent redirect (`/aa-test`) |
| `AA_TRANSACTION_LOOKBACK_MONTHS` | No (default `6`) | Server-side FI data range |
| `SETU_ENVIRONMENT` | Setu | `sandbox` or `production` |
| `SETU_FIU_BASE_URL` | Setu | `https://fiu-sandbox.setu.co` (sandbox) |
| `SETU_AUTH_BASE_URL` | Setu | `https://orgservice-prod.setu.co/v1` |
| `SETU_CLIENT_ID` | Setu | From Setu Bridge |
| `SETU_CLIENT_SECRET` | Setu | Server only |
| `SETU_PRODUCT_INSTANCE_ID` | Setu | FIU product instance |

Never use `NEXT_PUBLIC_*` for secrets. `.env*` is gitignored (`.env.example` allowed).

## Setu sandbox setup

1. Create / access a Setu Bridge FIU sandbox product.  
2. Copy **Client ID**, **Client Secret**, **Product Instance ID**.  
3. Register redirect URL: `http://localhost:3000/aa-test` (or your tunnel URL).  
4. `.env.local`:

```env
AA_PROVIDER=setu
SETU_ENVIRONMENT=sandbox
SETU_FIU_BASE_URL=https://fiu-sandbox.setu.co
SETU_AUTH_BASE_URL=https://orgservice-prod.setu.co/v1
SETU_CLIENT_ID=...
SETU_CLIENT_SECRET=...
SETU_PRODUCT_INSTANCE_ID=...
AA_REDIRECT_URI=http://localhost:3000/aa-test
AA_TRANSACTION_LOOKBACK_MONTHS=6
```

5. `npm run dev` → open `/aa-test` → enter a customer mobile number → connect → complete Setu consent → fetch → calculate.

Consent `vua` is the **runtime customer mobile number**, not an environment variable. Account availability is `POST /v2/account-availability` on Setu, exposed locally as `POST /api/aa/account-availability`.

## Authentication (api-1.json)

`POST {SETU_AUTH_BASE_URL}/users/login`  
Header: `client: bridge`  
Body: `{ clientID, grant_type: "client_credentials", secret }`  
Response: `{ access_token, refresh_token? }`  

Token is cached in **server memory only**. Never logged, never sent to the browser.

## Consent + FI session flow

| Step | API |
| --- | --- |
| Create consent | `POST /v2/consents` |
| Get status | `GET /v2/consents/{request_id}` |
| Create FI session | `POST /v2/sessions` (`format: json`) |
| Get FI data | `GET /v2/sessions/{session_id}` |
| List sessions | `GET /v2/consents/{consent_id}/data-sessions` |

All FIU calls send `Authorization: Bearer <token>` and `x-product-instance-id`.

Consent create (`POST /v2/consents`) uses purpose **102**, `consentTypes` PROFILE + TRANSACTIONS, `fiTypes` DEPOSIT, `fetchType` ONETIME, `consentMode` VIEW. `vua` is the runtime 10-digit mobile number.

## Transaction normalization

Setu `account.transactions.transaction[]` → `EngineTransactionInput`:

| Setu | Engine |
| --- | --- |
| `txnId` / `reference` / hash | `id` |
| `transactionTimestamp` / `valueDate` | `date` |
| `narration` | `description` |
| *(none)* | `merchant` left undefined |
| `amount` (string) | `amount` (number) |
| `type` | `DEBIT` / `CREDIT` |

Multi-account DEPOSIT data is merged and **deduplicated** before the engine.

## App API routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/aa/connect` | Create consent (`{ mobileNumber }`) |
| `POST` | `/api/aa/account-availability` | Setu AAs available for a mobile |
| `GET` | `/api/aa/status?consentId=` | Verify consent (server-side) |
| `POST` | `/api/aa/session` | Create FI session (after ACTIVE) |
| `GET` | `/api/aa/transactions?sessionId=` | Poll / fetch normalized txns |
| `GET` | `/api/aa/sessions?consentId=` | List sessions |
| `GET` | `/api/inflation/demo` | Engine demo on CSV |
| `POST` | `/api/inflation/calculate` | Engine on provided transactions |

## Testing

```bash
npm test
npm run lint
npm run build
```

Setu HTTP calls are mocked in unit tests — real credentials are not required for CI.

## Production disclaimer

Sandbox credentials and flows are **not** production-ready. Live AA usage needs formal FIU onboarding, security review, consent UX compliance, and production Setu credentials.

## Database — Supabase PostgreSQL + Drizzle ORM

INFLORA uses **Supabase** (hosted PostgreSQL) with **Drizzle ORM** for persistent storage.

### Architecture

```text
Next.js Server (API Routes / Server Components)
         ↓
   Drizzle ORM
         ↓
Supabase PostgreSQL
         ↓
   (Users, AA Connections, Consents, Sessions,
    Financial Accounts, Transactions,
    Inflation Results, Inflation Drivers)
```

**Important:** The application uses **direct PostgreSQL access** via Drizzle, not Supabase's Data API. Supabase is the hosted PostgreSQL provider.

### Database Tables

- **users** — Application user identity (placeholder for auth integration)
- **aa_connections** — User's AA provider connections
- **aa_consents** — Consent lifecycle from Setu/mock
- **aa_sessions** — FI data fetch sessions
- **financial_accounts** — Bank accounts discovered via AA
- **transactions** — Normalized financial transactions (monetary precision: numeric 14,2)
- **inflation_results** — Stored personal inflation analysis results
- **inflation_drivers** — Per-category inflation contribution drivers

### Supabase Setup

1. **Create Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create a new project
   - Choose a region (closest to your users)
   - Set a strong database password

2. **Get Connection String**
   - Open project dashboard
   - Navigate to: **Settings** → **Database**
   - Scroll to **Connection string**
   - Select **Connection pooling** → **Transaction mode** (recommended for serverless)
   - Copy the connection string (format: `postgresql://postgres.xxx:[YOUR-PASSWORD]@xxx.pooler.supabase.com:6543/postgres`)

3. **Configure Environment**
   
   Add to `.env.local`:

   ```env
   DATABASE_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@xxx.pooler.supabase.com:6543/postgres
   ```

   **Never commit real credentials!** The `.env.local` file is gitignored.

4. **Install Dependencies**
   
   Dependencies already installed:
   ```bash
   npm install drizzle-orm postgres
   npm install -D drizzle-kit
   ```

5. **Generate Migration**
   
   ```bash
   npm run db:generate
   ```
   
   This creates migration files in `./drizzle/` from the schema defined in `src/db/schema.ts`.

6. **Apply Migration**
   
   ```bash
   npm run db:migrate
   ```
   
   Or use push for rapid development (no migration history):
   
   ```bash
   npm run db:push
   ```

7. **Seed Development Data (Optional)**
   
   ```bash
   npx tsx src/db/seed.ts
   ```
   
   Creates:
   - 1 test user
   - 1 mock AA connection
   - 1 consent (ACTIVE)
   - 1 session (COMPLETED)
   - 1 financial account
   - 5 sample transactions
   - 1 inflation result with drivers

8. **Test Database Connection**
   
   ```bash
   npm run dev
   ```
   
   Then visit: [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db)
   
   Should return:
   ```json
   {
     "database": "connected",
     "status": "healthy"
   }
   ```

### Database Scripts

| Command | Purpose |
| --- | --- |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to database |
| `npm run db:push` | Push schema directly (dev only, no migration history) |
| `npm run db:studio` | Launch Drizzle Studio (visual database browser) |

### Drizzle Studio

Explore your database visually:

```bash
npm run db:studio
```

Opens at [https://local.drizzle.studio](https://local.drizzle.studio)

### Data Flow: AA → Database → Engine

```text
Setu AA Gateway
      ↓
FI Data (DEPOSIT transactions)
      ↓
Normalize (Setu → EngineTransactionInput)
      ↓
saveNormalizedTransactions(userId, accountId, source, transactions[])
      ↓
Supabase PostgreSQL (transactions table)
      ↓
getTransactionsByUserAndDateRange(userId, from, to)
      ↓
toEngineTransactionInputs(dbTransactions)
      ↓
calculateInflora({ transactions, cpi, merchantMapping })
      ↓
saveInflationAnalysis(userId, result, from, to)
      ↓
Supabase PostgreSQL (inflation_results + inflation_drivers)
```

The inflation engine (`src/lib/inflation/`) remains pure — no database or Setu dependencies.

### Repository Layer

All database operations go through repositories in `src/db/repositories/`:

- `users.ts` — User CRUD
- `aa-connections.ts` — AA connection management
- `aa-consents.ts` — Consent lifecycle
- `aa-sessions.ts` — Session tracking
- `financial-accounts.ts` — Account persistence
- `transactions.ts` — Transaction ingestion, queries, deduplication, engine conversion
- `inflation-results.ts` — Inflation analysis persistence with drivers

**Never import `src/db/` in client components.** Database access is server-side only.

### Security

- ✅ `DATABASE_URL` is **server-only** (never exposed to browser)
- ✅ All user queries filter by `userId` (application-level RLS)
- ✅ No Supabase secrets in client code
- ✅ No raw Setu credentials stored in database
- ✅ Financial amounts use PostgreSQL `numeric(14,2)` (no floating-point precision loss)
- ✅ Transaction deduplication by `providerTransactionId`

### Production Considerations

- Configure Supabase Row Level Security (RLS) policies when Supabase Auth is integrated
- Use Supabase connection pooler (transaction mode) for serverless environments
- Monitor connection pool usage
- Consider read replicas for analytics queries
- Implement proper user authentication before exposing financial data APIs

### Troubleshooting

**"DATABASE_URL is not configured"**
- Ensure `.env.local` contains `DATABASE_URL`
- Restart Next.js dev server after adding environment variables

**Connection pool exhausted**
- Increase Supabase connection pool size (Project settings)
- Use transaction pooler mode instead of session mode
- Close unused database connections

**Migration conflicts**
- Check `drizzle/` folder for pending migrations
- Ensure schema changes are reflected in `src/db/schema.ts`
- Use `npm run db:push` for rapid prototyping (drops migration history)

**Transaction precision errors**
- Always use `String(amount)` when inserting monetary values
- Use `Number(dbAmount)` when converting back to engine format
- Never use JavaScript floating-point for financial calculations
