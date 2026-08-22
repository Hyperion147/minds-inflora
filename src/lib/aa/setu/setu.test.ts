import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
import {
  buildTokenRequestBody,
  resetSetuTokenCacheForTests,
} from "@/lib/aa/setu/auth";
import {
  PURPOSE_102,
  buildCreateConsentRequest,
  createSetuConsent,
  getSetuConsent,
} from "@/lib/aa/setu/consent";
import {
  dedupeEngineTransactions,
  deterministicTxnId,
  normalizeSetuDepositTransaction,
  normalizeSetuFiDataToEngineTransactions,
  normalizeTxnType,
  parseAmount,
} from "@/lib/aa/normalize";
import {
  AaService,
  createAaProvider,
  calculateTransactionDataRange,
} from "@/lib/aa";
import type { AccountAggregatorProvider } from "@/lib/aa";
import { clampDataRangeToConsent } from "@/lib/aa/dataRange";
import { getConsentIdFromCallbackParams } from "@/lib/aa/callbackParams";
import { MockAaProvider, resetMockAaForTests } from "@/lib/aa/mock/provider";
import { normalizeMobileInput } from "@/lib/aa/mobileInput";
import { SetuAaProvider } from "@/lib/aa/setu/provider";
import { normalizeSetuError } from "@/lib/aa/setu/errors";
import { AaError } from "@/lib/aa/types";
import type { FIDataFetchResponseV2 } from "@/lib/aa/setu/types";
import type { SetuEnv } from "@/lib/env";
import { getAppEnv } from "@/lib/env";
import {
  calculateInflora,
  loadDemoTransactionsCsv,
  loadInfloraEngineData,
} from "@/lib/inflation";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(),
      isAxiosError: actual.isAxiosError,
    },
    isAxiosError: actual.isAxiosError,
  };
});

const setuEnv: SetuEnv = {
  SETU_ENVIRONMENT: "sandbox",
  SETU_FIU_BASE_URL: "https://fiu-sandbox.setu.co",
  SETU_AUTH_BASE_URL: "https://orgservice-prod.setu.co/v1",
  SETU_CLIENT_ID: "test-client",
  SETU_CLIENT_SECRET: "test-secret",
  SETU_PRODUCT_INSTANCE_ID: "product-instance-1",
};

function mockAxiosInstance(handlers: {
  post?: ReturnType<typeof vi.fn>;
  get?: ReturnType<typeof vi.fn>;
  interceptors?: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
}) {
  const instance = {
    post: handlers.post ?? vi.fn(),
    get: handlers.get ?? vi.fn(),
    request: vi.fn(),
    interceptors: handlers.interceptors ?? {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return instance;
}

describe("Setu authentication", () => {
  beforeEach(() => {
    resetSetuTokenCacheForTests();
    vi.clearAllMocks();
  });

  it("builds TokenAPIRequest exactly per OpenAPI", () => {
    const body = buildTokenRequestBody(setuEnv);
    expect(body).toEqual({
      clientID: "test-client",
      grant_type: "client_credentials",
      secret: "test-secret",
    });
  });

  it("acquires access token via POST /users/login with client: bridge", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { access_token: "tok_abc", refresh_token: "ref_xyz" },
    });
    const create = vi.mocked(axios.create);
    create.mockReturnValue(mockAxiosInstance({ post }) as never);

    const { SetuAuth } = await import("@/lib/aa/setu/auth");
    const auth = new SetuAuth(setuEnv);
    const token = await auth.getAccessToken();

    expect(token).toBe("tok_abc");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://orgservice-prod.setu.co/v1",
        headers: expect.objectContaining({ client: "bridge" }),
      }),
    );
    expect(post).toHaveBeenCalledWith("/users/login", {
      clientID: "test-client",
      grant_type: "client_credentials",
      secret: "test-secret",
    });
  });

  it("maps HTTP status codes to safe AaErrors", () => {
    const make = (status: number) =>
      normalizeSetuError(
        Object.assign(new AxiosError("fail"), {
          response: { status, data: { errorCode: "E", errorMsg: "msg" } },
          isAxiosError: true,
        }),
      );

    // AxiosError instances are detected by axios.isAxiosError
    const err401 = make(401);
    expect(err401).toBeInstanceOf(AaError);
    expect(err401).toMatchObject({ code: "SETU_UNAUTHORIZED", statusCode: 401 });
    expect(String(err401.message)).not.toMatch(/Bearer|secret|access_token/i);

    const err400 = make(400);
    expect(err400.statusCode).toBe(400);
    const err500 = make(500);
    expect(err500.statusCode).toBe(502);
    expect(err500.code).toBe("SETU_SERVER_ERROR");
  });

  it("redacts secrets in provider error messages", () => {
    const err = normalizeSetuError(
      Object.assign(new AxiosError("fail"), {
        response: {
          status: 400,
          data: {
            errorCode: "E",
            errorMsg: "Authorization: Bearer tok_secret_value failed",
          },
        },
        isAxiosError: true,
      }),
    );
    expect(err.message).not.toMatch(/tok_secret_value/);
    expect(err.message).toMatch(/\[REDACTED\]/);
  });
});

describe("Setu Axios client headers", () => {
  it("registers interceptors for Authorization and x-product-instance-id", async () => {
    const requestUse = vi.fn();
    const responseUse = vi.fn();
    const create = vi.mocked(axios.create);
    create.mockReturnValue(
      mockAxiosInstance({
        interceptors: {
          request: { use: requestUse },
          response: { use: responseUse },
        },
      }) as never,
    );

    // Auth client + FIU client each call create
    const post = vi.fn().mockResolvedValue({ data: { access_token: "t" } });
    create
      .mockReturnValueOnce(mockAxiosInstance({ post }) as never)
      .mockReturnValueOnce(
        mockAxiosInstance({
          interceptors: {
            request: { use: requestUse },
            response: { use: responseUse },
          },
        }) as never,
      );

    const { createSetuClient } = await import("@/lib/aa/setu/client");
    createSetuClient(setuEnv);
    expect(requestUse).toHaveBeenCalled();
    expect(responseUse).toHaveBeenCalled();
  });
});

describe("consent status parsing", () => {
  it("marks ACTIVE as canFetchData", async () => {
    const { consentAllowsDataFetch } = await import("@/lib/aa/setu/consent");
    expect(consentAllowsDataFetch("ACTIVE")).toBe(true);
    expect(consentAllowsDataFetch("REJECTED")).toBe(false);
    expect(consentAllowsDataFetch("EXPIRED")).toBe(false);
    expect(consentAllowsDataFetch("PENDING")).toBe(false);
  });

  it("purpose 102 matches OpenAPI ConsentRequestPurpose shape", () => {
    expect(PURPOSE_102).toEqual({
      code: "102",
      text: "Customer spending and budget analysis",
      category: { type: "Personal Finance" },
      refUri: "https://api.rebit.org.in/aa/purpose/102.xml",
    });
  });
});

describe("Setu createConsent request (AA v2)", () => {
  const dataRange = {
    from: "2026-02-22T00:00:00.000Z",
    to: "2026-08-22T12:00:00.000Z",
  };
  const redirectUrl = "https://example.ngrok-free.app/aa-test";

  beforeEach(() => {
    resetSetuTokenCacheForTests();
    vi.clearAllMocks();
  });

  it("builds payload: VUA, purpose 102, no context, TRANSACTIONS only, DEPOSIT, VIEW, dataRange, redirect", () => {
    const body = buildCreateConsentRequest({
      vua: "9999999999",
      dataRange,
      redirectUrl,
    });

    expect(body.vua).toBe("9999999999");
    expect(body.purpose?.code).toBe("102");
    expect(body.purpose?.text).toBe("Customer spending and budget analysis");
    expect(body).not.toHaveProperty("context");
    expect(body.consentTypes).toEqual(["TRANSACTIONS"]);
    expect(body.fiTypes).toEqual(["DEPOSIT"]);
    expect(body.fetchType).toBe("ONETIME");
    expect(body.consentMode).toBe("VIEW");
    expect(body.consentDuration).toEqual({ unit: "MONTH", value: 1 });
    expect(body.dataLife).toEqual({ unit: "DAY", value: 0 });
    expect(body.frequency).toEqual({ unit: "HOUR", value: 1 });
    expect(body.dataRange).toEqual(dataRange);
    expect(body.redirectUrl).toBe(redirectUrl);
    expect(body).not.toHaveProperty("PAN");
    expect(body).not.toHaveProperty("additionalParams");
    expect(body).not.toHaveProperty("enableAdditionalPhoneNumber");
    expect(body).not.toHaveProperty("dataFilter");
  });

  it("does not read VUA from environment", () => {
    process.env.SETU_VUA = "1111111111@onemoney";
    const body = buildCreateConsentRequest({
      vua: "9999999999",
      dataRange,
      redirectUrl,
    });
    expect(body.vua).toBe("9999999999");
    expect(body.vua).not.toBe(process.env.SETU_VUA);
    delete process.env.SETU_VUA;
  });

  it("POSTs /v2/consents and parses id, url, status", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        id: "consent-1",
        url: "https://fiu-sandbox.setu.co/consents/consent-1",
        status: "PENDING",
      },
    });
    const result = await createSetuConsent(
      { http: { post } } as never,
      { vua: "9999999999", dataRange, redirectUrl },
    );
    expect(post).toHaveBeenCalledWith(
      "/v2/consents",
      expect.objectContaining({
        vua: "9999999999",
        consentTypes: ["TRANSACTIONS"],
        fiTypes: ["DEPOSIT"],
        redirectUrl,
      }),
    );
    expect(post).toHaveBeenCalledWith(
      "/v2/consents",
      expect.not.objectContaining({ context: expect.anything() }),
    );
    expect(result).toMatchObject({
      id: "consent-1",
      url: "https://fiu-sandbox.setu.co/consents/consent-1",
      status: "PENDING",
    });
  });

  it("SetuAaProvider.createConsent normalizes mobile as VUA and returns safe fields", async () => {
    resetSetuTokenCacheForTests();
    const postFiu = vi.fn().mockResolvedValue({
      data: {
        id: "consent-2",
        url: "https://consents.setu.co/j/abc",
        status: "PENDING",
      },
    });
    const create = vi.mocked(axios.create);
    create
      .mockReturnValueOnce(mockAxiosInstance({ post: vi.fn() }) as never)
      .mockReturnValueOnce(mockAxiosInstance({ post: postFiu }) as never);

    const provider = new SetuAaProvider(setuEnv);
    const result = await provider.createConsent({
      mobileNumber: "+91 99999 99999",
      dataRange,
      redirectUrl,
    });

    expect(postFiu).toHaveBeenCalledWith(
      "/v2/consents",
      expect.objectContaining({ vua: "9999999999" }),
    );
    expect(result).toEqual({
      consentId: "consent-2",
      consentUrl: "https://consents.setu.co/j/abc",
      status: "PENDING",
    });
    expect(JSON.stringify(result)).not.toMatch(/secret|access_token|Bearer/i);
  });

  it("SetuAaProvider.createConsent rejects missing mobile", async () => {
    const create = vi.mocked(axios.create);
    create
      .mockReturnValueOnce(mockAxiosInstance({}) as never)
      .mockReturnValueOnce(mockAxiosInstance({}) as never);
    const provider = new SetuAaProvider(setuEnv);
    await expect(
      provider.createConsent({
        redirectUrl,
        dataRange,
      }),
    ).rejects.toMatchObject({ code: "MISSING_MOBILE_NUMBER" });
  });
});

describe("DEPOSIT transaction normalization", () => {
  it("maps txnId, narration, timestamp, amount string, debit/credit", () => {
    const txn = normalizeSetuDepositTransaction({
      txnId: "T1",
      amount: "540.00",
      narration: "SWIGGY BANGALORE",
      transactionTimestamp: "2026-07-02T10:00:00+05:30",
      type: "DEBIT",
    });
    expect(txn).toEqual({
      id: "T1",
      date: "2026-07-02T10:00:00+05:30",
      merchant: undefined,
      description: "SWIGGY BANGALORE",
      amount: 540,
      currency: "INR",
      type: "DEBIT",
    });
  });

  it("keeps Setu sandbox narration as description without inventing a merchant", () => {
    const txn = normalizeSetuDepositTransaction({
      txnId: "T-SANDBOX",
      amount: "2239042.00",
      narration: "UPI/P2M/000001/MERCHANT PAYMENT",
      transactionTimestamp: "2026-08-22T12:00:00.000Z",
      type: "DEBIT",
    });

    expect(txn).toEqual({
      id: "T-SANDBOX",
      date: "2026-08-22T12:00:00.000Z",
      merchant: undefined,
      description: "UPI/P2M/000001/MERCHANT PAYMENT",
      amount: 2239042,
      currency: "INR",
      type: "DEBIT",
    });
  });

  it("falls back to valueDate and reference / hash", () => {
    const txn = normalizeSetuDepositTransaction({
      reference: "REF-9",
      amount: "100",
      valueDate: "2026-07-01",
      type: "credit",
    });
    expect(txn?.id).toBe("REF-9");
    expect(txn?.date).toBe("2026-07-01");
    expect(txn?.type).toBe("CREDIT");

    const hashed = normalizeSetuDepositTransaction({
      amount: "10",
      narration: "X",
      valueDate: "2026-07-01",
      type: "DR",
    });
    expect(hashed?.id.startsWith("hash_")).toBe(true);
  });

  it("rejects invalid amounts and unknown types", () => {
    expect(
      normalizeSetuDepositTransaction({
        amount: "abc",
        type: "DEBIT",
        valueDate: "2026-07-01",
      }),
    ).toBeNull();
    expect(parseAmount("1,299.50")).toBe(1299.5);
    expect(normalizeTxnType("debit")).toBe("DEBIT");
    expect(normalizeTxnType("nope")).toBeNull();
  });

  it("handles missing narration", () => {
    const txn = normalizeSetuDepositTransaction({
      txnId: "T2",
      amount: "1",
      type: "DEBIT",
      valueDate: "2026-07-01",
    });
    expect(txn?.description).toBeUndefined();
  });

  it("deduplicates and supports multiple DEPOSIT accounts", () => {
    const session: FIDataFetchResponseV2 = {
      id: "sess-1",
      consentId: "cons-1",
      status: "COMPLETED",
      format: "json",
      dataRange: { from: "2026-01-01T00:00:00Z", to: "2026-07-01T00:00:00Z" },
      fips: [
        {
          fipID: "FIP-A",
          accounts: [
            {
              maskedAccNumber: "XXXX1111",
              linkRefNumber: "L1",
              FIstatus: "READY",
              data: {
                account: {
                  type: "deposit",
                  transactions: {
                    transaction: [
                      {
                        txnId: "DUP",
                        amount: "10",
                        type: "DEBIT",
                        valueDate: "2026-07-01",
                        narration: "A",
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        {
          fipID: "FIP-B",
          accounts: [
            {
              maskedAccNumber: "XXXX2222",
              linkRefNumber: "L2",
              FIstatus: "READY",
              data: {
                account: {
                  type: "deposit",
                  transactions: {
                    transaction: [
                      {
                        txnId: "DUP",
                        amount: "10",
                        type: "DEBIT",
                        valueDate: "2026-07-01",
                        narration: "A",
                      },
                      {
                        txnId: "UNIQUE",
                        amount: "20",
                        type: "CREDIT",
                        transactionTimestamp: "2026-07-02T00:00:00Z",
                        narration: "B",
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    };

    const txns = normalizeSetuFiDataToEngineTransactions(session);
    expect(txns).toHaveLength(2);
    expect(txns.map((t) => t.id).sort()).toEqual(["DUP", "UNIQUE"]);
  });

  it("dedupe helper keeps first occurrence", () => {
    const list = dedupeEngineTransactions([
      {
        id: "1",
        date: "d",
        amount: 1,
        currency: "INR",
        type: "DEBIT",
      },
      {
        id: "1",
        date: "d",
        amount: 1,
        currency: "INR",
        type: "DEBIT",
      },
    ]);
    expect(list).toHaveLength(1);
    expect(deterministicTxnId({
      date: "d",
      amount: 1,
      narration: "n",
      type: "DEBIT",
    })).toMatch(/^hash_/);
  });
});

describe("mock provider + engine unchanged", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AA_PROVIDER = "mock";
    process.env.APP_BASE_URL = "http://localhost:3000";
    resetMockAaForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("selects mock provider by default", () => {
    const provider = createAaProvider(getAppEnv());
    expect(provider).toBeInstanceOf(MockAaProvider);
  });

  it("simulates consent → ACTIVE → session → transactions", async () => {
    const env = getAppEnv();
    const provider = new MockAaProvider(env);
    const range = calculateTransactionDataRange(6);

    const created = await provider.createConsent({
      redirectUrl: "http://localhost:3000/aa-test",
      dataRange: range,
    });
    expect(created.status).toBe("PENDING");

    provider.setConsentStatus(created.consentId, "ACTIVE");
    const status = await provider.getConsentStatus(created.consentId);
    expect(status.canFetchData).toBe(true);

    const session = await provider.createFinancialDataSession(
      created.consentId,
      range,
    );
    expect(session.status).toBe("PENDING");

    const pending = await provider.getFinancialData(session.sessionId);
    expect(pending.status).toBe("PENDING");

    const completed = await provider.getFinancialData(session.sessionId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.transactionCount).toBeGreaterThan(0);
  });

  it("existing inflation engine still works on demo CSV", () => {
    const { cpi, merchantMapping } = loadInfloraEngineData();
    const transactions = loadDemoTransactionsCsv();
    const result = calculateInflora({ transactions, cpi, merchantMapping });
    expect(result.personalInflation).toBeGreaterThan(0);
    expect(result.headlineInflation).toBe(4.45);
  });

  it("SetuAaProvider is selected when AA_PROVIDER=setu", () => {
    process.env.AA_PROVIDER = "setu";
    process.env.SETU_CLIENT_ID = "c";
    process.env.SETU_CLIENT_SECRET = "s";
    process.env.SETU_PRODUCT_INSTANCE_ID = "p";
    const provider = createAaProvider(getAppEnv());
    expect(provider).toBeInstanceOf(SetuAaProvider);
  });
});

describe("runtime VUA from customer mobile", () => {
  it("reads Setu callback id query param as the returned consent id", () => {
    const params = new URLSearchParams("success=true&id=consent-123");
    expect(getConsentIdFromCallbackParams(params)).toBe("consent-123");
  });

  it("browser input normalizer strips AA handles before API requests", () => {
    expect(normalizeMobileInput("9999999999@onemoney")).toBe("9999999999");
    expect(
      JSON.stringify({
        mobileNumber: normalizeMobileInput("9999999999@onemoney"),
      }),
    ).toBe('{"mobileNumber":"9999999999"}');
  });

  it("parseCustomerMobileNumber rejects empty and accepts 10 digits", async () => {
    const { parseCustomerMobileNumber } = await import("@/lib/aa/mobile");
    expect(() => parseCustomerMobileNumber("")).toThrow(AaError);
    expect(() => parseCustomerMobileNumber("12345")).toThrow(AaError);
    expect(() => parseCustomerMobileNumber(undefined)).toThrow(AaError);
    expect(parseCustomerMobileNumber("9876543210")).toBe("9876543210");
    expect(parseCustomerMobileNumber("+91 98765 43210")).toBe("9876543210");
    expect(parseCustomerMobileNumber("09876543210")).toBe("9876543210");
  });
});

describe("FI session status handling", () => {
  it("data range is ISO and lookback-configurable", () => {
    const range = calculateTransactionDataRange(6, new Date("2026-07-21T00:00:00Z"));
    expect(range.to).toBe("2026-07-21T00:00:00.000Z");
    expect(range.from).toBe("2026-01-21T00:00:00.000Z");
  });

  it("clamps requested FI range to the consent FI range boundaries", () => {
    const consentRange = {
      from: "2026-02-22T00:00:00.000Z",
      to: "2026-08-22T12:00:00.000Z",
    };
    const requestedRange = {
      from: "2026-02-21T23:59:59.000Z",
      to: "2026-08-22T12:00:01.000Z",
    };

    expect(clampDataRangeToConsent(requestedRange, consentRange)).toEqual(
      consentRange,
    );
  });

  it("Setu get consent preserves the active consent FI dataRange", async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        id: "consent-1",
        url: "https://consents.setu.co/j/abc",
        status: "ACTIVE",
        detail: {
          dataRange: {
            from: "2026-02-22T00:00:00.000Z",
            to: "2026-08-22T12:00:00.000Z",
          },
        },
      },
    });

    const response = await getSetuConsent(
      { http: { get } } as never,
      "consent-1",
      true,
    );

    expect(get).toHaveBeenCalledWith("/v2/consents/consent-1", {
      params: { expanded: true },
    });
    expect(response.detail?.dataRange).toEqual({
      from: "2026-02-22T00:00:00.000Z",
      to: "2026-08-22T12:00:00.000Z",
    });
  });

  it("AaService creates FI sessions with the consent-approved dataRange", async () => {
    const consentRange = {
      from: "2026-02-22T00:00:00.000Z",
      to: "2026-08-22T12:00:00.000Z",
    };
    let sessionRange: typeof consentRange | undefined;
    const provider: AccountAggregatorProvider = {
      name: "setu",
      createConsent: vi.fn() as never,
      getConsentStatus: vi.fn().mockResolvedValue({
        consentId: "consent-1",
        status: "ACTIVE",
        canFetchData: true,
        dataRange: consentRange,
      }),
      createFinancialDataSession: vi.fn().mockImplementation(
        async (consentId: string, dataRange: typeof consentRange) => {
          sessionRange = dataRange;
          return {
            sessionId: "session-1",
            consentId,
            status: "PENDING",
            dataRange,
          };
        },
      ),
      getFinancialData: vi.fn() as never,
    };
    const service = new AaService(provider, {
      AA_PROVIDER: "setu",
      APP_BASE_URL: "http://localhost:3000",
      AA_TRANSACTION_LOOKBACK_MONTHS: 6,
    });

    await service.createSession("consent-1");

    expect(sessionRange).toEqual(consentRange);
  });
});
