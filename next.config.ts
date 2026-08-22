import type { NextConfig } from "next";

const allowedDevOrigins = new Set<string>(["**.ngrok-free.dev"]);
const redirectUri = process.env.AA_REDIRECT_URI;

if (redirectUri) {
  try {
    allowedDevOrigins.add(new URL(redirectUri).hostname);
  } catch {
    // Invalid env values are reported by src/lib/env.ts at runtime.
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [...allowedDevOrigins],
};

export default nextConfig;
