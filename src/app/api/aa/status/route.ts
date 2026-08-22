import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

/**
 * GET /api/aa/status?consentId=...
 * Always verifies status server-side with the provider.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const consentId = url.searchParams.get("consentId");
    if (!consentId) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }

    const service = getAaService();
    const result = await service.getStatus(consentId);
    return Response.json({
      success: true,
      consentId: result.consentId,
      status: result.status,
      canFetchData: result.canFetchData,
      provider: service.providerName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
