const CONSENT_ID_PARAM_NAMES = ["consentId", "id", "requestId", "request_id"];

export function getConsentIdFromCallbackParams(
  params: Pick<URLSearchParams, "get">,
): string | null {
  for (const name of CONSENT_ID_PARAM_NAMES) {
    const value = params.get(name);
    if (value) return value;
  }
  return null;
}
