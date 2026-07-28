/**
 * Mint a Clerk Agent Task login URL for browser debugging.
 * Uses a +clerk_test email (OTP always 424242 in Clerk test mode).
 *
 * Usage: node scripts/clerk-test-login.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClerkClient } from "@clerk/backend";

const root = resolve(import.meta.dirname, "..");

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const secretKey = process.env.CLERK_SECRET_KEY?.trim();
if (!secretKey) {
  console.error("Missing CLERK_SECRET_KEY");
  process.exit(1);
}
if (!secretKey.startsWith("sk_test_")) {
  console.error("Refusing to run: CLERK_SECRET_KEY is not a test key (sk_test_).");
  process.exit(1);
}

const TEST_EMAIL =
  process.env.CLERK_TEST_EMAIL?.trim() ||
  "flippin+clerk_test@example.com";
const REDIRECT =
  process.env.CLERK_TEST_REDIRECT?.trim() || "http://localhost:3000/app";

const clerk = createClerkClient({ secretKey });

const existing = await clerk.users.getUserList({
  emailAddress: [TEST_EMAIL],
  limit: 1,
});

let user = existing.data[0];
if (!user) {
  console.log(`Creating test user ${TEST_EMAIL}`);
  user = await clerk.users.createUser({
    emailAddress: [TEST_EMAIL],
    skipPasswordRequirement: true,
    skipPasswordChecks: true,
  });
} else {
  console.log(`Found test user ${TEST_EMAIL} (${user.id})`);
}

// Prefer Agent Tasks when available; fall back to sign-in token.
let loginUrl = null;
try {
  const agentTask = await clerk.agentTasks.create({
    onBehalfOf: { userId: user.id },
    permissions: "*",
    agentName: "cursor-debug",
    taskDescription: "Browser click debug login",
    redirectUrl: REDIRECT,
  });
  loginUrl = agentTask.url;
  console.log("method=agentTask");
} catch (error) {
  console.warn(
    "agentTasks unavailable, falling back to sign-in token:",
    error instanceof Error ? error.message : error,
  );
  const token = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 300,
  });
  loginUrl = token.url;
  console.log("method=signInToken");
}

console.log(`email=${TEST_EMAIL}`);
console.log(`userId=${user.id}`);
console.log(`loginUrl=${loginUrl}`);
console.log("otp=424242 (if UI asks for email code)");
