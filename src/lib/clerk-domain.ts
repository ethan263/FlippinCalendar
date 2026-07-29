/**
 * Clerk Frontend API hostnames for flippinCalendar.
 * Supabase third-party auth validates JWTs against this domain's JWKS endpoint.
 */
export const CLERK_PRODUCTION_FAPI_HOST = "clerk.flippincalendar.co.za";

/** Dev instance FAPI — swap in supabase/config.toml when using pk_test locally. */
export const CLERK_DEVELOPMENT_FAPI_HOST = "deep-alien-66.clerk.accounts.dev";

export function getClerkFapiHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CLERK_FAPI_HOST?.trim();
  if (fromEnv) return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (publishableKey.includes("_live_")) {
    return CLERK_PRODUCTION_FAPI_HOST;
  }

  return CLERK_DEVELOPMENT_FAPI_HOST;
}

export function getClerkJwksUrl(host = getClerkFapiHost()): string {
  return `https://${host}/.well-known/jwks.json`;
}
