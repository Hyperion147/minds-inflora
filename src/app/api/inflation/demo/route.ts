import { NextResponse } from "next/server";
import {
  calculateInflora,
  loadDemoTransactionsCsv,
  loadInfloraEngineData,
} from "@/lib/inflation";

/**
 * Development utility: run the inflation engine on demo_transactions.csv
 * using official CPI values from the data pack.
 *
 * GET /api/inflation/demo
 */
export async function GET() {
  try {
    const { cpi, merchantMapping, datasetVersion } = loadInfloraEngineData();
    const transactions = loadDemoTransactionsCsv();

    const result = calculateInflora({
      transactions,
      cpi,
      merchantMapping,
    });

    return NextResponse.json({
      datasetVersion,
      note: "Official CPI from MoSPI data pack; merchant map + demo txns are synthetic.",
      per100ImpactNote:
        "per100Impact equals contribution percentage points under a simplified weighted model — not a literal bill increase.",
      result,
    });
  } catch (error) {
    console.error("[inflation/demo]", error);
    return NextResponse.json(
      {
        error: {
          code: "DEMO_FAILED",
          message: "Unable to run inflation demo.",
        },
      },
      { status: 500 },
    );
  }
}
