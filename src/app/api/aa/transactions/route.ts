import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

/**
 * GET /api/aa/transactions?sessionId=...
 * PENDING → { status: PENDING }; COMPLETED → normalized transactions.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      throw new AaError("MISSING_SESSION_ID", "sessionId is required.", 400);
    }

    const service = getAaService();
    const result = await service.getTransactions(sessionId);

    if (result.status === "PENDING" || result.status === "ACTIVE") {
      return Response.json({
        success: true,
        status: result.status,
        sessionId: result.sessionId,
        consentId: result.consentId,
        traceId: result.traceId,
        txnId: result.txnId,
        providerMessage: result.providerMessage,
        fips: result.fips ?? [],
      });
    }

    const canUseReturnedData =
      Boolean(result.hasUsableAccountData) ||
      (result.transactionCount ?? result.transactions?.length ?? 0) > 0;

    if (
      (result.status === "FAILED" || result.status === "EXPIRED") &&
      !canUseReturnedData
    ) {
      return Response.json(
        {
          success: false,
          status: result.status,
          sessionId: result.sessionId,
          consentId: result.consentId,
          traceId: result.traceId,
          txnId: result.txnId,
          fips: result.fips ?? [],
          error: {
            code: "SETU_SESSION_FAILED",
            message:
              result.providerMessage ??
              `Setu sandbox marked this FI session as ${result.status}.`,
          },
        },
        { status: 409 },
      );
    }

    return Response.json({
      success: true,
      status: result.status,
      sessionId: result.sessionId,
      consentId: result.consentId,
      transactionCount: result.transactionCount ?? 0,
      transactions: result.transactions ?? [],
      traceId: result.traceId,
      txnId: result.txnId,
      providerMessage: result.providerMessage,
      fips: result.fips ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
