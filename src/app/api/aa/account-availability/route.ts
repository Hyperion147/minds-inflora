import { z } from "zod";
import { getAaService } from "@/lib/aa/service";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

const bodySchema = z.object({
  mobileNumber: z.string().min(1),
});

/**
 * POST /api/aa/account-availability
 * Development helper: calls Setu Account Availability server-side.
 * Returns only aa / vua / status — no credentials.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AaError(
        "MISSING_MOBILE_NUMBER",
        "mobileNumber is required.",
        400,
      );
    }

    const service = getAaService();
    const result = await service.getAccountAvailability(
      parsed.data.mobileNumber,
    );
    return Response.json({
      success: true,
      accounts: result.accounts,
      provider: service.providerName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
