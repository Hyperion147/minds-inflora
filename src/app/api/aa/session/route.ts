import { z } from "zod";
import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

const bodySchema = z.object({
  consentId: z.string().min(1),
});

/**
 * POST /api/aa/session
 * Verifies consent ACTIVE with provider, then creates FI data session.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AaError("MISSING_CONSENT_ID", "consentId is required.", 400);
    }

    const service = getAaService();
    const session = await service.createSession(parsed.data.consentId);
    return Response.json({
      success: true,
      sessionId: session.sessionId,
      consentId: session.consentId,
      status: session.status,
      dataRange: session.dataRange,
      reused: session.reused ?? false,
    });
  } catch (error) {
    return jsonError(error);
  }
}
