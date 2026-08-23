import { describe, expect, it, vi } from "vitest";
import { getSessionPollDelayMs, pollSessionTransactions } from "@/lib/aa/sessionPolling";
import type { EngineTransactionInput } from "@/lib/inflation/types";

const sampleTransactions: EngineTransactionInput[] = [
  {
    id: "txn-1",
    date: "2026-08-01T00:00:00.000Z",
    amount: 1200,
    currency: "INR",
    type: "DEBIT",
    description: "Sample transaction",
  },
];

describe("pollSessionTransactions", () => {
  it("returns processing when FI data stays pending beyond the polling window", async () => {
    let elapsed = 0;
    const result = await pollSessionTransactions({
      sessionId: "session-1",
      fetchSession: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        data: { status: "PENDING" },
      }),
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      maxDurationMs: 1_000,
    });

    expect(result).toEqual({
      kind: "processing",
      status: "PENDING",
      reason: "timeout",
      message:
        "Financial data is still being processed by the provider. It exceeded our polling window.",
    });
  });

  it("returns transactions when FI data is ready", async () => {
    const result = await pollSessionTransactions({
      sessionId: "session-2",
      fetchSession: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        data: {
          status: "COMPLETED",
          transactions: sampleTransactions,
          transactionCount: sampleTransactions.length,
        },
      }),
      sleep: vi.fn(),
    });

    expect(result).toEqual({
      kind: "ready",
      status: "COMPLETED",
      transactions: sampleTransactions,
      transactionCount: 1,
      providerMessage: undefined,
      traceId: undefined,
      txnId: undefined,
      fips: undefined,
    });
  });

  it("returns transactions for PARTIAL sessions with READY accounts", async () => {
    const result = await pollSessionTransactions({
      sessionId: "session-partial",
      fetchSession: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        data: {
          status: "PARTIAL",
          transactions: sampleTransactions,
          transactionCount: sampleTransactions.length,
          fips: [
            {
              fipId: "setu-fip",
              accounts: [
                { maskedAccNumber: "XXXX3365", status: "TIMEOUT" },
                { maskedAccNumber: "XXXX4411", status: "READY" },
              ],
            },
          ],
        },
      }),
      sleep: vi.fn(),
    });

    expect(result).toMatchObject({
      kind: "ready",
      status: "PARTIAL",
      transactionCount: 1,
    });
  });

  it("fails after transient errors exceed the retry budget", async () => {
    let elapsed = 0;
    const result = await pollSessionTransactions({
      sessionId: "session-3",
      fetchSession: vi.fn().mockResolvedValue({
        ok: false,
        statusCode: 502,
        data: {
          error: {
            code: "SETU_SERVER_ERROR",
            message: "Setu AA Gateway is temporarily unavailable.",
          },
        },
      }),
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      maxTransientRetries: 2,
    });

    expect(result).toEqual({
      kind: "failed",
      errorCode: "SETU_SERVER_ERROR",
      message: "Setu AA Gateway is temporarily unavailable.",
    });
  });

  it("fails when the FI session is FAILED and no READY account data is available", async () => {
    const result = await pollSessionTransactions({
      sessionId: "session-failed",
      fetchSession: vi.fn().mockResolvedValue({
        ok: false,
        statusCode: 409,
        data: {
          status: "FAILED",
          traceId: "trace-1",
          error: {
            code: "SETU_SESSION_FAILED",
            message: "Setu sandbox marked this FI session as FAILED.",
          },
          fips: [
            {
              fipId: "setu-fip",
              accounts: [{ maskedAccNumber: "XXXX3365", status: "TIMEOUT" }],
            },
          ],
        },
      }),
      sleep: vi.fn(),
    });

    expect(result).toEqual({
      kind: "failed",
      status: "FAILED",
      errorCode: "SETU_SESSION_FAILED",
      message: "Setu sandbox marked this FI session as FAILED.",
      traceId: "trace-1",
      txnId: undefined,
      providerMessage: undefined,
      fips: [
        {
          fipId: "setu-fip",
          accounts: [{ maskedAccNumber: "XXXX3365", status: "TIMEOUT" }],
        },
      ],
    });
  });

  it("returns usable data even if the overall session is FAILED when READY accounts exist", async () => {
    const result = await pollSessionTransactions({
      sessionId: "session-failed-usable",
      fetchSession: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        data: {
          status: "FAILED",
          transactions: sampleTransactions,
          transactionCount: sampleTransactions.length,
          providerMessage:
            "Setu marked the overall session failed, but READY account data is available.",
          fips: [
            {
              fipId: "setu-fip",
              accounts: [
                { maskedAccNumber: "XXXX3365", status: "TIMEOUT" },
                { maskedAccNumber: "XXXX4411", status: "READY" },
              ],
            },
          ],
        },
      }),
      sleep: vi.fn(),
    });

    expect(result).toMatchObject({
      kind: "ready",
      status: "FAILED",
      transactionCount: 1,
    });
  });

  it("eventually succeeds after retrying transient failures and pending status", async () => {
    let elapsed = 0;
    const fetchSession = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        statusCode: 502,
        data: {
          error: {
            code: "SETU_SERVER_ERROR",
            message: "Setu AA Gateway is temporarily unavailable.",
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        statusCode: 200,
        data: { status: "PENDING" },
      })
      .mockResolvedValueOnce({
        ok: true,
        statusCode: 200,
        data: {
          status: "COMPLETED",
          transactions: sampleTransactions,
          transactionCount: sampleTransactions.length,
        },
      });

    const progress = vi.fn();

    const result = await pollSessionTransactions({
      sessionId: "session-4",
      fetchSession,
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      onProgress: progress,
    });

    expect(result).toEqual({
      kind: "ready",
      status: "COMPLETED",
      transactions: sampleTransactions,
      transactionCount: 1,
    });
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("backs off poll delays instead of using a fixed interval", () => {
    expect([
      getSessionPollDelayMs(0),
      getSessionPollDelayMs(1),
      getSessionPollDelayMs(2),
      getSessionPollDelayMs(3),
      getSessionPollDelayMs(10),
    ]).toEqual([1_500, 2_500, 4_000, 6_500, 15_000]);
  });
});
