export function normalizeMobileInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    return digits.slice(2, 12);
  }
  if (digits.startsWith("0") && digits.length > 10) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}
