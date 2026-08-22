import { z } from "zod";

const providerSchema = z.enum(["mock", "setu"]);

const baseEnvSchema = z.object({
  AA_PROVIDER: providerSchema.default("mock"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AA_REDIRECT_URI: z.string().url().optional(),
  AA_TRANSACTION_LOOKBACK_MONTHS: z.coerce.number().int().min(1).max(24).default(6),
});

const setuEnvSchema = z.object({
  SETU_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  SETU_FIU_BASE_URL: z.string().url(),
  SETU_AUTH_BASE_URL: z.string().url(),
  SETU_CLIENT_ID: z.string().min(1),
  SETU_CLIENT_SECRET: z.string().min(1),
  SETU_PRODUCT_INSTANCE_ID: z.string().min(1),
});

export type SetuEnv = z.infer<typeof setuEnvSchema>;

export type AppEnv = z.infer<typeof baseEnvSchema> & {
  setu?: SetuEnv;
};

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

const SANDBOX_FIU = "https://fiu-sandbox.setu.co";
const PROD_FIU = "https://fiu.setu.co";
const DEFAULT_AUTH = "https://orgservice-prod.setu.co/v1";

export function getAppEnv(): AppEnv {
  const parsed = baseEnvSchema.safeParse({
    AA_PROVIDER: process.env.AA_PROVIDER ?? "mock",
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    AA_REDIRECT_URI: process.env.AA_REDIRECT_URI,
    AA_TRANSACTION_LOOKBACK_MONTHS:
      process.env.AA_TRANSACTION_LOOKBACK_MONTHS ?? "6",
  });

  if (!parsed.success) {
    throw new EnvValidationError(
      `Invalid environment configuration: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const env: AppEnv = { ...parsed.data };

  if (parsed.data.AA_PROVIDER === "setu") {
    const environment =
      (process.env.SETU_ENVIRONMENT as "sandbox" | "production" | undefined) ??
      "sandbox";
    const defaultFiu = environment === "production" ? PROD_FIU : SANDBOX_FIU;

    const setuParsed = setuEnvSchema.safeParse({
      SETU_ENVIRONMENT: environment,
      SETU_FIU_BASE_URL: process.env.SETU_FIU_BASE_URL ?? defaultFiu,
      SETU_AUTH_BASE_URL: process.env.SETU_AUTH_BASE_URL ?? DEFAULT_AUTH,
      SETU_CLIENT_ID: process.env.SETU_CLIENT_ID,
      SETU_CLIENT_SECRET: process.env.SETU_CLIENT_SECRET,
      SETU_PRODUCT_INSTANCE_ID: process.env.SETU_PRODUCT_INSTANCE_ID,
    });

    if (!setuParsed.success) {
      throw new EnvValidationError(
        `Setu AA provider requires credentials. Missing/invalid: ${setuParsed.error.issues
          .map((i) => i.path.join("."))
          .join(", ")}. See .env.example and README.`,
      );
    }

    env.setu = setuParsed.data;
  }

  return env;
}

export function getRedirectUri(env: AppEnv = getAppEnv()): string {
  if (env.AA_REDIRECT_URI) return env.AA_REDIRECT_URI;
  return `${env.APP_BASE_URL}/aa-test`;
}

export function requireSetuEnv(env: AppEnv = getAppEnv()): SetuEnv {
  if (!env.setu) {
    throw new EnvValidationError(
      "Setu credentials are not configured. Set AA_PROVIDER=setu and required SETU_* variables.",
    );
  }
  return env.setu;
}
