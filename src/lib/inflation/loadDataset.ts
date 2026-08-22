import { readFileSync } from "fs";
import path from "path";
import type {
  CpiDataset,
  CpiDivision,
  EngineTransactionInput,
  MerchantCategoryMapping,
} from "./types";

type InfloraEngineDataFile = {
  dataset_version: string;
  official_data: {
    cpi_series: string;
    sector: string;
    latest_reference_month: string;
    headline_cpi_inflation: number;
    source?: string;
    source_url?: string;
  };
  cpi_divisions: Array<{
    code: string;
    name: string;
    combined_weight: number;
    july_2026_index?: number;
    july_2026_inflation: number;
    app_category: string;
  }>;
  merchant_category_mapping: Record<string, string>;
  demo_transactions?: EngineTransactionInput[];
};

/**
 * Load official CPI + synthetic merchant map from the data pack JSON.
 * CPI values are taken as-is from the file (MoSPI source of truth).
 */
export function loadInfloraEngineData(
  dataDir = path.join(process.cwd(), "data"),
): {
  cpi: CpiDataset;
  merchantMapping: MerchantCategoryMapping;
  demoTransactions: EngineTransactionInput[];
  datasetVersion: string;
} {
  const filePath = path.join(dataDir, "inflora_engine_data.json");
  const raw = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as InfloraEngineDataFile;

  return {
    datasetVersion: raw.dataset_version,
    cpi: cpiDatasetFromOfficial(raw),
    merchantMapping: raw.merchant_category_mapping as MerchantCategoryMapping,
    demoTransactions: raw.demo_transactions ?? [],
  };
}

export function cpiDatasetFromOfficial(
  raw: InfloraEngineDataFile,
): CpiDataset {
  const divisions: CpiDivision[] = raw.cpi_divisions.map((d) => ({
    code: d.code,
    name: d.name,
    combinedWeight: d.combined_weight,
    inflationRate: d.july_2026_inflation,
    index: d.july_2026_index,
    appCategory: d.app_category as CpiDivision["appCategory"],
  }));

  return {
    referenceMonth: raw.official_data.latest_reference_month,
    headlineInflation: raw.official_data.headline_cpi_inflation,
    cpiSeries: raw.official_data.cpi_series,
    sector: raw.official_data.sector,
    source: raw.official_data.source,
    sourceUrl: raw.official_data.source_url,
    divisions,
  };
}

/**
 * Parse demo_transactions.csv (synthetic). Simple CSV — no quoted commas in pack.
 */
export function loadDemoTransactionsCsv(
  dataDir = path.join(process.cwd(), "data"),
): EngineTransactionInput[] {
  const filePath = path.join(dataDir, "demo_transactions.csv");
  const text = readFileSync(filePath, "utf8").trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    id: header.indexOf("id"),
    date: header.indexOf("date"),
    merchant: header.indexOf("merchant"),
    amount: header.indexOf("amount"),
    currency: header.indexOf("currency"),
    type: header.indexOf("type"),
  };

  const rows: EngineTransactionInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const type = cols[idx.type]?.trim().toUpperCase();
    if (type !== "DEBIT" && type !== "CREDIT") continue;

    rows.push({
      id: cols[idx.id]?.trim() ?? `row-${i}`,
      date: cols[idx.date]?.trim() ?? "",
      merchant: cols[idx.merchant]?.trim(),
      amount: Number(cols[idx.amount]),
      currency: cols[idx.currency]?.trim() || "INR",
      type,
    });
  }

  return rows;
}
