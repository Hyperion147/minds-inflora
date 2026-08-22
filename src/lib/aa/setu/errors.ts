import axios, { AxiosError, isAxiosError } from "axios";
import { AaError } from "@/lib/aa/types";
import type { SetuErrorBody } from "./types";

export function normalizeSetuError(error: unknown): AaError {
  if (error instanceof AaError) {
    return error;
  }

  if (isAxiosError(error)) {
    return fromAxiosError(error);
  }

  if (error instanceof Error) {
    return new AaError("INTERNAL_ERROR", error.message || "An unexpected error occurred.", 500);
  }

  return new AaError(
    "INTERNAL_ERROR",
    "An unexpected Account Aggregator error occurred.",
    500,
  );
}

function fromAxiosError(error: AxiosError<SetuErrorBody>): AaError {
  const status = error.response?.status;
  const body = error.response?.data;
  const providerCode = body?.errorCode;
  const providerMsg = body?.errorMsg ?? body?.message;
  const traceId = body?.traceId;

  if (traceId) {
    console.error("[Setu]", {
      status,
      errorCode: providerCode,
      traceId,
      path: error.config?.url,
    });
  } else {
    console.error("[Setu]", {
      status,
      errorCode: providerCode,
      path: error.config?.url,
      method: error.config?.method,
    });
  }

  if (status === 400) {
    return new AaError(
      providerCode ?? "SETU_BAD_REQUEST",
      safeClientMessage(providerMsg) || "Invalid request to Setu AA Gateway.",
      400,
    );
  }
  if (status === 401) {
    return new AaError(
      "SETU_UNAUTHORIZED",
      "Setu authentication failed. Check client credentials.",
      401,
    );
  }
  if (status === 403) {
    return new AaError(
      "SETU_FORBIDDEN",
      "Setu denied access to this resource.",
      403,
    );
  }
  if (status === 404) {
    return new AaError(
      "SETU_NOT_FOUND",
      "Requested Setu resource was not found.",
      404,
    );
  }
  if (status === 429) {
    return new AaError(
      "SETU_RATE_LIMITED",
      "Setu rate limit exceeded. Try again shortly.",
      429,
    );
  }
  if (status && status >= 500) {
    return new AaError(
      "SETU_SERVER_ERROR",
      "Setu AA Gateway is temporarily unavailable.",
      502,
    );
  }

  if (error.code === "ECONNABORTED" || error.code === "ENOTFOUND") {
    return new AaError(
      "SETU_NETWORK_ERROR",
      "Unable to reach Setu AA Gateway.",
      502,
    );
  }

  return new AaError(
    "SETU_REQUEST_FAILED",
    "Setu AA Gateway request failed.",
    502,
  );
}

function safeClientMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message
    .replace(/(secret|token|authorization|bearer)\s*[:=]?\s*\S+/gi, "[REDACTED]")
    .slice(0, 280);
}

export { axios, isAxiosError };
