import { z } from "zod";
import {
  calculateInflora,
  loadInfloraEngineData,
} from "@/lib/inflation";
import { jsonError } from "@/lib/aa/http";
import { AaError } from "@/lib/aa/types";

const txnSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  merchant: z.string().optional(),
  description: z.string().optional(),
  amount: z.number(),
  currency: z.string().min(1),
  type: z.enum(["DEBIT", "CREDIT"]),
});

const bodySchema = z.object({
  transactions: z.array(txnSchema).min(1),
});

/**
 * POST /api/inflation/calculate
 * Runs the EXISTING inflation engine on normalized transactions.
 * No Setu / AA knowledge inside the engine.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AaError(
        "INVALID_TRANSACTIONS",
        "Provide a non-empty transactions array in engine input format.",
        400,
      );
    }

    const { cpi, merchantMapping } = loadInfloraEngineData();
    const result = calculateInflora({
      transactions: parsed.data.transactions,
      cpi,
      merchantMapping,
    });

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
