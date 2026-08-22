import { NextResponse } from "next/server";
import { AaError } from "@/lib/aa/types";
import { EnvValidationError } from "@/lib/env";
import { safeErrorMessage } from "@/lib/utils";
import { normalizeSetuError } from "@/lib/aa/setu/errors";

export function jsonError(error: unknown): NextResponse {
  const normalized =
    error instanceof AaError || error instanceof EnvValidationError
      ? error
      : normalizeSetuError(error);

  if (normalized instanceof EnvValidationError) {
    console.error("[AA] env", normalized.message);
    return NextResponse.json(
      { error: { code: "ENV_INVALID", message: normalized.message } },
      { status: 500 },
    );
  }

  if (normalized instanceof AaError) {
    console.error("[AA]", {
      code: normalized.code,
      message: normalized.message,
    });
    return NextResponse.json(
      { error: { code: normalized.code, message: normalized.message } },
      { status: normalized.statusCode },
    );
  }

  console.error("[AA] unexpected", safeErrorMessage(error));
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}
