import "server-only";

import { getDashboardData } from "./getDashboardData";

export async function getDashboardRouteData(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

  return getDashboardData({
    mode: first(params.mode),
    sessionId: first(params.sessionId),
    consentId: first(params.consentId),
  });
}