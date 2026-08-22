import type { SetuClient } from "./client";
import type {
  CreateFIDataFetchRequestV2,
  DataRange,
  DataSessionsListResponse,
  FIDataFetchResponseV2,
} from "./types";

/**
 * POST /v2/sessions — CreateFIDataFetchRequestV2
 */
export async function createSetuFiSession(
  client: SetuClient,
  consentId: string,
  dataRange: DataRange,
): Promise<FIDataFetchResponseV2> {
  const body: CreateFIDataFetchRequestV2 = {
    consentId,
    dataRange,
    format: "json",
  };

  const response = await client.http.post<FIDataFetchResponseV2>(
    "/v2/sessions",
    body,
  );
  return response.data;
}

/**
 * GET /v2/sessions/{session_id}
 */
export async function getSetuFiSession(
  client: SetuClient,
  sessionId: string,
): Promise<FIDataFetchResponseV2> {
  const response = await client.http.get<FIDataFetchResponseV2>(
    `/v2/sessions/${encodeURIComponent(sessionId)}`,
  );
  return response.data;
}

/**
 * GET /v2/consents/{consent_id}/data-sessions
 */
export async function listSetuDataSessions(
  client: SetuClient,
  consentId: string,
): Promise<DataSessionsListResponse> {
  const response = await client.http.get<DataSessionsListResponse>(
    `/v2/consents/${encodeURIComponent(consentId)}/data-sessions`,
  );
  return response.data;
}
