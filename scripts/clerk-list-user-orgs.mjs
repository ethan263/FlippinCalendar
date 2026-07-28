import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClerkClient } from "@clerk/backend";

const root = resolve(import.meta.dirname, "..");
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
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

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY.trim(),
});

const userId = process.argv[2] || "user_3H7oy4yl7a37sorCC4MtPRdkTbP";
const memberships = await clerk.users.getOrganizationMembershipList({
  userId,
  limit: 20,
});
console.log(
  JSON.stringify(
    memberships.data.map((m) => ({
      orgId: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
    null,
    2,
  ),
);
