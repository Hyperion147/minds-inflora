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
      });
    }

    return Response.json({
      success: true,
      status: result.status,
      sessionId: result.sessionId,
      consentId: result.consentId,
      transactionCount: result.transactionCount ?? 0,
      transactions: result.transactions ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
