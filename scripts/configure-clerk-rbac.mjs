#!/usr/bin/env node

/**
 * Hobby-compatible RBAC for flippinCalendar.
 *
 * Clerk Hobby includes custom *permissions* but not custom *roles* / role sets
 * (those need the B2B Authentication add-on). This script only:
 *   1. Ensures `org:operations_hub:manage`
 *   2. Grants it to system roles `org:admin` and `org:member`
 *
 * Org creators remain admins (Clerk default). Invited teammates are members and
 * can operate the workspace. Billing / org settings stay admin-gated in app code.
 */

import { createClerkClient } from "@clerk/backend";

const permissionDefinition = {
  name: "Manage operations hub",
  key: "org:operations_hub:manage",
  description:
    "Access customer contacts and manage operational bookings for the active organization.",
};

const legacyPermissionKey = "org:operations:manage";
const legacyOperatorRoleKey = "org:operator";
const adminRoleKey = "org:admin";
const memberRoleKey = "org:member";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    "CLERK_SECRET_KEY is required. Run this command with the target Clerk instance's server environment loaded.",
  );
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function ensurePermission() {
  const { data } = await clerk.organizationPermissions.getOrganizationPermissionList({
    limit: 100,
  });
  const existing = data.find(
    (permission) => permission.key === permissionDefinition.key,
  );
  if (existing) return existing;

  const legacy = data.find(
    (permission) => permission.key === legacyPermissionKey,
  );
  if (legacy) {
    return clerk.organizationPermissions.updateOrganizationPermission({
      permissionId: legacy.id,
      ...permissionDefinition,
    });
  }
  return clerk.organizationPermissions.createOrganizationPermission(
    permissionDefinition,
  );
}

async function requireRole(roleKey) {
  const { data } = await clerk.organizationRoles.getOrganizationRoleList({
    limit: 100,
    query: roleKey,
  });
  const role = data.find((candidate) => candidate.key === roleKey);
  if (!role) throw new Error(`Required Clerk role ${roleKey} was not found.`);
  return role;
}

async function ensureRolePermission(role, permission) {
  if (role.permissions.some((candidate) => candidate.id === permission.id)) {
    return role;
  }
  return clerk.organizationRoles.assignPermissionToOrganizationRole({
    organizationRoleId: role.id,
    permissionId: permission.id,
  });
}

async function removeLegacyPermission(permission) {
  const [{ data: permissions }, { data: roles }] = await Promise.all([
    clerk.organizationPermissions.getOrganizationPermissionList({ limit: 100 }),
    clerk.organizationRoles.getOrganizationRoleList({ limit: 100 }),
  ]);
  const legacyPermissions = permissions.filter(
    (candidate) =>
      candidate.key === legacyPermissionKey && candidate.id !== permission.id,
  );
  for (const legacy of legacyPermissions) {
    for (const role of roles) {
      if (!role.permissions.some((candidate) => candidate.id === legacy.id)) {
        continue;
      }
      if (!role.permissions.some((candidate) => candidate.id === permission.id)) {
        await clerk.organizationRoles.assignPermissionToOrganizationRole({
          organizationRoleId: role.id,
          permissionId: permission.id,
        });
      }
    }
    await clerk.organizationPermissions.deleteOrganizationPermission(legacy.id);
  }
}

/**
 * Best-effort cleanup of the old paid custom role. Safe to no-op when the
 * B2B add-on is absent or the role was never created.
 */
async function removeLegacyOperatorRole() {
  const { data: roles } = await clerk.organizationRoles.getOrganizationRoleList({
    limit: 100,
  });
  const operator = roles.find((role) => role.key === legacyOperatorRoleKey);
  if (!operator) {
    return { removed: false, reason: "not_present" };
  }

  try {
    await clerk.organizationRoles.deleteOrganizationRole(operator.id);
    return { removed: true, id: operator.id };
  } catch (error) {
    return {
      removed: false,
      reason: "delete_failed",
      message: error instanceof Error ? error.message : String(error),
      hint: "Remove org:operator in the Clerk Dashboard Roles UI if Production still flags custom roles.",
    };
  }
}

const permission = await ensurePermission();
const adminRole = await requireRole(adminRoleKey);
const memberRole = await requireRole(memberRoleKey);

const [verifiedAdminRole, verifiedMemberRole] = await Promise.all([
  ensureRolePermission(adminRole, permission),
  ensureRolePermission(memberRole, permission),
]);
await removeLegacyPermission(permission);
const legacyOperator = await removeLegacyOperatorRole();

for (const role of [verifiedAdminRole, verifiedMemberRole]) {
  const keys = role.permissions.map((candidate) => candidate.key);
  if (!keys.includes(permissionDefinition.key)) {
    throw new Error(
      `Clerk RBAC verification failed: ${role.key} is missing ${permissionDefinition.key}.`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      mode: "hobby",
      permission: { id: permission.id, key: permission.key },
      roles: [verifiedAdminRole, verifiedMemberRole].map((role) => ({
        id: role.id,
        key: role.key,
        permissions: role.permissions.map((candidate) => candidate.key),
      })),
      legacyOperator,
      notes: [
        "Custom roles / role sets are not used (Hobby-compatible).",
        "Members and admins both receive org:operations_hub:manage.",
        "Keep org membership ≤20 without the B2B Authentication add-on.",
      ],
    },
    null,
    2,
  ),
);
