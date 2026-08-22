import { z } from "zod";
import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

const bodySchema = z.object({
  mobileNumber: z.string().min(1).optional(),
});

/**
 * POST /api/aa/connect
 * Body: { mobileNumber } — required for Setu; optional for mock.
 * Creates consent server-side (VUA = customer mobile for Setu).
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      throw new AaError(
        "INVALID_REQUEST",
        "Request body must be JSON with optional mobileNumber.",
        400,
      );
    }

    const service = getAaService();
    const result = await service.connect(parsed.data.mobileNumber);
    return Response.json({
      success: true,
      consentId: result.consentId,
      url: result.consentUrl,
      status: result.status,
      provider: result.provider,
    });
  } catch (error) {
    return jsonError(error);
  }
}
