#!/usr/bin/env node
/**
 * Smoke-check Clerk ↔ Supabase third-party auth wiring (no secrets printed).
 *
 * Usage:
 *   node scripts/verify-clerk-supabase.mjs
 *   node scripts/verify-clerk-supabase.mjs --domain clerk.flippincalendar.co.za
 */

const args = process.argv.slice(2);
const domainFlag = args.find((arg) => arg.startsWith("--domain="));
const domain =
  (domainFlag ? domainFlag.split("=")[1] : args[args.indexOf("--domain") + 1]) ??
  process.env.NEXT_PUBLIC_CLERK_FAPI_HOST ??
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("_live_")
    ? "clerk.flippincalendar.co.za"
    : "deep-alien-66.clerk.accounts.dev");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

function ok(message) {
  console.log(`✓ ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

async function checkJwks(clerkDomain) {
  const url = `https://${clerkDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/.well-known/jwks.json`;
  const response = await fetch(url);
  if (!response.ok) {
    fail(`Clerk JWKS unreachable (${response.status}) at ${url}`);
    return;
  }
  const body = await response.json();
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    fail(`Clerk JWKS at ${url} returned no keys`);
    return;
  }
  ok(`Clerk JWKS reachable (${body.keys.length} key(s)) — ${url}`);
}

async function checkSupabaseReachable() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (response.status >= 500) {
    fail(`Supabase REST API error (${response.status})`);
    return;
  }
  ok(`Supabase REST API reachable (${response.status})`);
}

function checkEnv() {
  for (const name of requiredEnv) {
    if (process.env[name]?.trim()) {
      ok(`${name} is set`);
    } else {
      fail(`${name} is missing`);
    }
  }
}

function printManualSteps(clerkDomain) {
  console.log("\nManual dashboard steps (one-time per environment):\n");
  console.log(
    "1. Clerk Production → Activate Supabase integration\n" +
      "   https://dashboard.clerk.com/setup/supabase\n" +
      "   (adds role: authenticated to session tokens)\n",
  );
  console.log(
    "2. Supabase → Authentication → Third-party → Add Clerk\n" +
      `   Domain: ${clerkDomain}\n` +
      "   https://supabase.com/dashboard/project/labvbngxfkzeepyyyjov/auth/third-party\n",
  );
  console.log(
    "3. Push supabase/config.toml auth section to the linked project:\n" +
      "   supabase login && supabase config push --project-ref labvbngxfkzeepyyyjov\n",
  );
}

async function main() {
  console.log(`Clerk FAPI domain: ${domain}\n`);
  checkEnv();
  await checkJwks(domain);
  await checkSupabaseReachable();
  printManualSteps(domain);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
