import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { SetuEnv } from "@/lib/env";
import { SetuAuth } from "./auth";
import { normalizeSetuError } from "./errors";

/**
 * Authenticated Axios client for Setu FIU base URL (api-1.json servers).
 * Attaches Authorization + x-product-instance-id on every request.
 */
export class SetuClient {
  readonly http: AxiosInstance;
  private readonly auth: SetuAuth;

  constructor(private readonly env: SetuEnv) {
    this.auth = new SetuAuth(env);
    this.http = axios.create({
      baseURL: env.SETU_FIU_BASE_URL.replace(/\/$/, ""),
      timeout: 30_000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    this.http.interceptors.request.use(async (config) => {
      const token = await this.auth.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-product-instance-id"] =
        this.env.SETU_PRODUCT_INSTANCE_ID;
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error.response?.status;
        const config = error.config as
          | (AxiosRequestConfig & { _retry?: boolean })
          | undefined;

        // One retry after forced token refresh on 401
        if (status === 401 && config && !config._retry) {
          config._retry = true;
          this.auth.clearCache();
          const token = await this.auth.getAccessToken(true);
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
            "x-product-instance-id": this.env.SETU_PRODUCT_INSTANCE_ID,
          };
          return this.http.request(config);
        }

        throw normalizeSetuError(error);
      },
    );
  }

  get productInstanceId(): string {
    return this.env.SETU_PRODUCT_INSTANCE_ID;
  }
}

export function createSetuClient(env: SetuEnv): SetuClient {
  return new SetuClient(env);
}
