#!/usr/bin/env node
/**
 * Sync Clerk Production keys + app URL into Vercel Production env.
 * Requires: vercel login (or VERCEL_TOKEN), .env.production.local from:
 *   clerk env pull --instance prod --file .env.production.local
 *
 * Usage: node --env-file=.env.production.local scripts/sync-clerk-prod-to-vercel.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const REQUIRED = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const EXTRA = {
  NEXT_PUBLIC_APP_URL: "https://flippincalendar.co.za",
  CLERK_AUTHORIZED_PARTIES:
    "https://flippincalendar.co.za,https://www.flippincalendar.co.za",
};

function mask(key, value) {
  if (key.includes("SECRET") || key.startsWith("sk_")) return `${value.slice(0, 8)}…`;
  if (value.startsWith("pk_")) return `${value.slice(0, 10)}…`;
  return value;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

const fileEnv = loadEnvFile(".env.production.local");
const values = { ...EXTRA };
for (const key of REQUIRED) {
  values[key] = process.env[key] || fileEnv[key];
  if (!values[key]) {
    console.error(`Missing ${key}. Run: clerk env pull --instance prod --file .env.production.local`);
    process.exit(1);
  }
  if (key.includes("CLERK") && !String(values[key]).includes("_live_")) {
    console.error(`${key} is not a live key — refusing to write to Vercel Production.`);
    process.exit(1);
  }
}

console.log("Will set on Vercel Production:");
for (const [k, v] of Object.entries(values)) {
  console.log(`  ${k}=${mask(k, v)}`);
}

function vercelEnvSet(key, value) {
  // Use the logged-in local CLI (npx vercel@41 has a separate empty auth store).
  spawnSync(
    "npx",
    ["--yes", "vercel", "env", "rm", key, "production", "-y"],
    { stdio: "ignore", shell: true },
  );
  const result = spawnSync(
    "npx",
    ["--yes", "vercel", "env", "add", key, "production"],
    { input: value, encoding: "utf8", shell: true },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`Failed to set ${key}`);
  }
  console.log(`Set ${key}`);
}

for (const [key, value] of Object.entries(values)) {
  vercelEnvSet(key, value);
}

console.log("Done. Redeploy Herpies production after env changes.");
