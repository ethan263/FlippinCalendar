/**
 * Canonical public origins for flippinCalendar.
 * Cloudflare DNS will front these hostnames; app hosting stays on Vercel until cutover.
 */
export const PRODUCTION_APEX_HOST = "flippincalendar.co.za";
export const PRODUCTION_WWW_HOST = `www.${PRODUCTION_APEX_HOST}`;

export const PRODUCTION_ORIGINS = [
  `https://${PRODUCTION_APEX_HOST}`,
  `https://${PRODUCTION_WWW_HOST}`,
] as const;

/** Canonical production origin — www (apex 308-redirects here via Vercel/DNS). */
export const PRODUCTION_APP_ORIGIN = PRODUCTION_ORIGINS[1];

/** Webhooks use the same apex domain (Cloudflare-proxied). */
export function getWebhooksOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WEBHOOKS_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // fall through
    }
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_ORIGIN;
  }

  return getAppOrigin();
}

/** Prefer explicit env; fall back to production apex only outside development. */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // fall through
    }
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_ORIGINS[0];
  }

  return "http://localhost:3000";
}

export function getMetadataBase(): URL {
  return new URL(`${getAppOrigin()}/`);
}

/**
 * Clerk authorizedParties: apex + www when pointing at production domain.
 * Override entirely with CLERK_AUTHORIZED_PARTIES when needed.
 */
export function getClerkAuthorizedParties(): string[] | undefined {
  const fromEnv = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return undefined;
  }

  try {
    const origin = new URL(appUrl).origin;
    const host = new URL(appUrl).hostname.replace(/^www\./, "");
    if (host === PRODUCTION_APEX_HOST) {
      return [...PRODUCTION_ORIGINS];
    }
    return [origin];
  } catch {
    return undefined;
  }
}
