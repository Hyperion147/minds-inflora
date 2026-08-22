import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import { jsonError } from "@/lib/aa/http";
import { MockAaProvider } from "@/lib/aa/mock/provider";
import { AaError } from "@/lib/aa/types";

const bodySchema = z.object({
  consentId: z.string().min(1),
  outcome: z.enum(["ACTIVE", "REJECTED"]),
});

/**
 * Mock-only: complete consent journey (simulates Setu redirect callback).
 */
export async function POST(request: Request) {
  try {
    const env = getAppEnv();
    if (env.AA_PROVIDER !== "mock") {
      throw new AaError(
        "MOCK_ONLY",
        "Mock consent completion is only available when AA_PROVIDER=mock.",
        400,
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AaError("INVALID_BODY", "consentId and outcome are required.", 400);
    }

    const provider = new MockAaProvider(env);
    provider.setConsentStatus(parsed.data.consentId, parsed.data.outcome);

    return Response.json({
      success: true,
      consentId: parsed.data.consentId,
      status: parsed.data.outcome,
    });
  } catch (error) {
    return jsonError(error);
  }
}
