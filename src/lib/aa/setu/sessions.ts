import type { SetuClient } from "./client";
import { maskId } from "../normalize";
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

  console.info("[Setu] create FI session request", {
    consentId: maskId(consentId),
    dataRange: body.dataRange,
    format: body.format,
  });

  const response = await client.http.post<FIDataFetchResponseV2>(
    "/v2/sessions",
    body,
  );
  console.info("[Setu] create FI session response", {
    httpStatus: response.status,
    consentId: maskId(consentId),
    sessionId: maskId(response.data.id),
    providerStatus: response.data.status,
    traceId: response.data.traceId,
    txnId: response.data.txnid,
    body: response.data,
  });
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
  console.info("[Setu] FI session fetch response", {
    httpStatus: response.status,
    sessionId: maskId(sessionId),
    providerStatus: response.data.status,
    traceId: response.data.traceId,
    txnId: response.data.txnid,
    body: response.data,
  });
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
  console.info("[Setu] data sessions response", {
    httpStatus: response.status,
    consentId: maskId(consentId),
    traceId: response.data.traceId,
    body: response.data,
  });
  return response.data;
}
