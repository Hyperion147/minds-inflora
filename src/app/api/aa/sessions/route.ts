import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

/**
 * GET /api/aa/sessions?consentId=...
 * Lists FI data sessions for a consent (Setu data-sessions API / mock).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const consentId = url.searchParams.get("consentId");
    if (!consentId) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }

    const service = getAaService();
    const result = await service.listSessions(consentId);
    return Response.json({
      success: true,
      consentId: result.consentId,
      sessions: result.sessions,
    });
  } catch (error) {
    return jsonError(error);
  }
}
