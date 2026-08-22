import { randomBytes } from "crypto";

export function createId(prefix?: string): string {
  const id = randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}

export function createStateToken(): string {
  return randomBytes(32).toString("hex");
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDisplayDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function safeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred.",
): string {
  if (error instanceof Error && error.message) {
    // Never surface secrets if they somehow appear in messages
    const scrubbed = error.message.replace(
      /(secret|token|key|password|authorization)=?[^\s,;]*/gi,
      "[REDACTED]",
    );
    return scrubbed;
  }
  return fallback;
}
