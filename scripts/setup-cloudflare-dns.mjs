#!/usr/bin/env node
/**
 * Enable Cloudflare proxy (orange cloud) on flippincalendar.co.za apex + www.
 * Clerk subdomains stay DNS-only.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/setup-cloudflare-dns.mjs
 *
 * Token permissions: Zone → DNS → Edit, Zone → Zone Settings → Edit
 */
const ZONE_ID = "73b778bb24f12046a304e30714ee96fb";
const APEX_RECORD_ID = "111e587fe68d2b811bfb6e7743b33826";
const WWW_RECORD_ID = "22211e3dbb7d347d86ca0d9e8556bc26";

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (Zone DNS Edit + Zone Settings Edit).");
  console.error("https://developers.cloudflare.com/fundamentals/api/get-started/create-token/");
  process.exit(1);
}

async function cf(path, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await response.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors ?? json));
  }
  return json.result;
}

async function main() {
  console.log("Enabling Cloudflare proxy on flippincalendar.co.za + www…");

  await cf(`/zones/${ZONE_ID}/dns_records/${APEX_RECORD_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      proxied: true,
      comment: "Vercel apex — proxied via Cloudflare",
    }),
  });

  await cf(`/zones/${ZONE_ID}/dns_records/${WWW_RECORD_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      proxied: true,
      comment: "Vercel www — proxied via Cloudflare",
    }),
  });

  await cf(`/zones/${ZONE_ID}/settings/ssl`, {
    method: "PATCH",
    body: JSON.stringify({ value: "full" }),
  });

  console.log("Done.");
  console.log("");
  console.log("App + webhook URLs (production):");
  console.log("  https://flippincalendar.co.za");
  console.log("  https://flippincalendar.co.za/api/webhooks/payfast");
  console.log("  https://flippincalendar.co.za/api/webhooks/elevenlabs");
  console.log("");
  console.log("Set in Vercel Production:");
  console.log("  NEXT_PUBLIC_APP_URL=https://flippincalendar.co.za");
  console.log("  CLERK_AUTHORIZED_PARTIES=https://flippincalendar.co.za,https://www.flippincalendar.co.za");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
