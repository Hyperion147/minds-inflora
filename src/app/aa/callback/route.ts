import { NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";

/**
 * Optional redirect landing if registered as AA_REDIRECT_URI=/aa/callback.
 * Prefer /aa-test for the MVP UI.
 */
export async function GET(request: Request) {
  const env = getAppEnv();
  const target = new URL("/aa-test", env.APP_BASE_URL);
  const incoming = new URL(request.url);

  incoming.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  if (!target.searchParams.has("consentId")) {
    const id =
      incoming.searchParams.get("id") ??
      incoming.searchParams.get("requestId") ??
      incoming.searchParams.get("request_id");
    if (id) target.searchParams.set("consentId", id);
  }

  return NextResponse.redirect(target);
}
