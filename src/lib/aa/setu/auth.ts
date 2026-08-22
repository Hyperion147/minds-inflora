import axios, { type AxiosInstance } from "axios";
import type { SetuEnv } from "@/lib/env";
import { AaError } from "@/lib/aa/types";
import type { TokenAPIRequest, TokenAPIResponse } from "./types";
import { normalizeSetuError } from "./errors";

type CachedToken = {
  accessToken: string;
  /** epoch ms — refresh slightly early */
  expiresAt: number;
};

const globalForAuth = globalThis as unknown as {
  __setuTokenCache?: CachedToken | null;
};

/**
 * Setu auth — POST /users/login on orgservice (api-1.json).
 * Header: client: bridge
 * Body: { clientID, grant_type: "client_credentials", secret }
 *
 * Tokens stay in server memory only — never cookies / localStorage / NEXT_PUBLIC.
 */
export class SetuAuth {
  private readonly authClient: AxiosInstance;

  constructor(private readonly env: SetuEnv) {
    this.authClient = axios.create({
      baseURL: env.SETU_AUTH_BASE_URL.replace(/\/$/, ""),
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        client: "bridge",
      },
    });
  }

  async getAccessToken(forceRefresh = false): Promise<string> {
    const cached = globalForAuth.__setuTokenCache;
    if (
      !forceRefresh &&
      cached &&
      Date.now() < cached.expiresAt - 60_000
    ) {
      return cached.accessToken;
    }

    const body: TokenAPIRequest = {
      clientID: this.env.SETU_CLIENT_ID,
      grant_type: "client_credentials",
      secret: this.env.SETU_CLIENT_SECRET,
    };

    try {
      const response = await this.authClient.post<TokenAPIResponse>(
        "/users/login",
        body,
      );

      const accessToken = response.data?.access_token;
      if (!accessToken) {
        throw new AaError(
          "SETU_AUTH_INVALID",
          "Setu login response did not include an access token.",
          502,
        );
      }

      globalForAuth.__setuTokenCache = {
        accessToken,
        expiresAt: Date.now() + estimateTokenTtlMs(accessToken),
      };

      // Never log tokens
      console.info("[SetuAuth] access token acquired");
      return accessToken;
    } catch (error) {
      throw normalizeSetuError(error);
    }
  }

  clearCache(): void {
    globalForAuth.__setuTokenCache = null;
  }
}

/** Prefer JWT exp when present; otherwise ~50 minutes. */
function estimateTokenTtlMs(accessToken: string): number {
  try {
    const parts = accessToken.split(".");
    if (parts.length >= 2 && parts[1]) {
      const json = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(json) as { exp?: number };
      if (typeof payload.exp === "number") {
        return Math.max(payload.exp * 1000 - Date.now(), 60_000);
      }
    }
  } catch {
    // ignore parse errors
  }
  return 50 * 60 * 1000;
}

/** Test helper */
export function resetSetuTokenCacheForTests(): void {
  globalForAuth.__setuTokenCache = null;
}

export function buildTokenRequestBody(env: SetuEnv): TokenAPIRequest {
  return {
    clientID: env.SETU_CLIENT_ID,
    grant_type: "client_credentials",
    secret: env.SETU_CLIENT_SECRET,
  };
}
