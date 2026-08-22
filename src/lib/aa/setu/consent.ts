import type { SetuClient } from "./client";
import type {
  ConsentResponseV2,
  CreateConsentRequestV2,
  DataRange,
  AccountAvailabilityRequest,
  AccountAvailabilityResponse,
} from "./types";

/** Purpose code 102 — OpenAPI requires category + refUri in addition to code/text. */
export const PURPOSE_102: NonNullable<CreateConsentRequestV2["purpose"]> = {
  code: "102",
  text: "Customer spending and budget analysis",
  category: { type: "Personal Finance" },
  refUri: "https://api.rebit.org.in/aa/purpose/102.xml",
};

export type CreateSetuConsentInput = {
  vua: string;
  dataRange: DataRange;
  redirectUrl: string;
};

/**
 * Build CreateConsentRequestV2.
 * Frequency unit is HOUR (OpenAPI enum); HOURLY in docs maps to unit HOUR, value 1.
 */
export function buildCreateConsentRequest(
  input: CreateSetuConsentInput,
): CreateConsentRequestV2 {
  return {
    vua: input.vua,
    dataRange: input.dataRange,
    redirectUrl: input.redirectUrl,
    consentTypes: ["TRANSACTIONS"],
    fiTypes: ["DEPOSIT"],
    fetchType: "ONETIME",
    consentMode: "VIEW",
    purpose: PURPOSE_102,
    consentDuration: { unit: "MONTH", value: 1 },
    dataLife: { unit: "DAY", value: 0 },
    frequency: { unit: "HOUR", value: 1 },
  };
}

/**
 * POST /v2/consents
 * Headers: Authorization, x-product-instance-id (via SetuClient)
 */
export async function createSetuConsent(
  client: SetuClient,
  input: CreateSetuConsentInput,
): Promise<ConsentResponseV2> {
  const body = buildCreateConsentRequest(input);
  const response = await client.http.post<ConsentResponseV2>(
    "/v2/consents",
    body,
  );
  return response.data;
}

/**
 * GET /v2/consents/{request_id}
 */
export async function getSetuConsent(
  client: SetuClient,
  consentId: string,
  expanded = false,
): Promise<ConsentResponseV2> {
  const response = await client.http.get<ConsentResponseV2>(
    `/v2/consents/${encodeURIComponent(consentId)}`,
    { params: expanded ? { expanded: true } : undefined },
  );
  return response.data;
}

/**
 * POST /v2/account-availability
 * Check which AAs are available for a mobile number
 */
export async function checkAccountAvailability(
  client: SetuClient,
  mobileNumber: string,
): Promise<AccountAvailabilityResponse> {
  const body: AccountAvailabilityRequest = {
    mobileNumber,
  };

  const response = await client.http.post<AccountAvailabilityResponse>(
    "/v2/account-availability",
    body,
  );
  return response.data;
}

export function consentAllowsDataFetch(status: string): boolean {
  return status === "ACTIVE";
}
