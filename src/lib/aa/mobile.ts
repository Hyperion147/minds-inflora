import { AaError } from "./types";

/**
 * Normalize a customer mobile number supplied at runtime.
 * Does not construct an AA VUA handle — Setu accepts the mobile as VUA.
 */
export function parseCustomerMobileNumber(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new AaError(
      "MISSING_MOBILE_NUMBER",
      "mobileNumber is required.",
      400,
    );
  }

  const digits = raw.replace(/\D/g, "");
  const national =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;

  if (national.length !== 10) {
    throw new AaError(
      "INVALID_MOBILE_NUMBER",
      "Enter a valid 10-digit mobile number.",
      400,
    );
  }

  return national;
}
