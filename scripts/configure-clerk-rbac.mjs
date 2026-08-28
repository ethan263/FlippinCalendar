#!/usr/bin/env node

/**
 * Hobby-compatible RBAC for flippinCalendar.
 *
 * Clerk Hobby includes custom *permissions* but not custom *roles* / role sets
 * (those need the B2B Authentication add-on). Default (Hobby) mode:
 *   1. Ensures `org:operations_hub:manage`
 *   2. Grants it to `org:admin` only — not every `org:member`
 *
 * Billing / settings stay admin-gated in app code. Operators (hub-only staff)
 * require the B2B add-on: set CLERK_B2B_AUTH=1 to also provision `org:operator`.
 */

import { createClerkClient } from "@clerk/backend";

const permissionDefinition = {
  name: "Manage operations hub",
  key: "org:operations_hub:manage",
  description:
    "Access customer contacts and manage operational bookings for the active organization.",
};

const legacyPermissionKey = "org:operations:manage";
const operatorRoleDefinition = {
  name: "Operator",
  key: "org:operator",
  description:
    "Operational staff who can manage customer contacts and bookings.",
};
const adminRoleKey = "org:admin";
const memberRoleKey = "org:member";
const initialRoleSetKey = "role_set:default";

const b2bMode = process.env.CLERK_B2B_AUTH === "1";

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

async function ensureRole(definition) {
  const { data } = await clerk.organizationRoles.getOrganizationRoleList({
    limit: 100,
  });
  const existing = data.find((role) => role.key === definition.key);
  return (
    existing ?? clerk.organizationRoles.createOrganizationRole(definition)
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

async function removePermissionFromRole(role, permission) {
  if (!role.permissions.some((candidate) => candidate.id === permission.id)) {
    return role;
  }
  return clerk.organizationRoles.removePermissionFromOrganizationRole({
    organizationRoleId: role.id,
    permissionId: permission.id,
  });
}

async function ensureInitialRoleSetIncludesOperator() {
  const roleSet = await clerk.roleSets.getRoleSet(initialRoleSetKey);
  if (roleSet.roles.some((role) => role.key === operatorRoleDefinition.key)) {
    return roleSet;
  }
  return clerk.roleSets.addRolesToRoleSet({
    roleSetKeyOrId: initialRoleSetKey,
    roleKeys: [operatorRoleDefinition.key],
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

const permission = await ensurePermission();
const adminRole = await requireRole(adminRoleKey);
const memberRole = await requireRole(memberRoleKey);

const verifiedAdminRole = await ensureRolePermission(adminRole, permission);
const verifiedMemberRole = await removePermissionFromRole(memberRole, permission);

let verifiedOperatorRole = null;
let roleSet = null;

if (b2bMode) {
  const operatorRole = await ensureRole(operatorRoleDefinition);
  [verifiedOperatorRole, roleSet] = await Promise.all([
    ensureRolePermission(operatorRole, permission),
    ensureInitialRoleSetIncludesOperator(),
  ]);

  const expectedRoleKeys = [adminRoleKey, memberRoleKey, operatorRoleDefinition.key];
  const actualRoleKeys = new Set(roleSet.roles.map((role) => role.key));
  for (const roleKey of expectedRoleKeys) {
    if (!actualRoleKeys.has(roleKey)) {
      throw new Error(`Clerk role set verification failed: ${roleKey} is missing.`);
    }
  }
  if (roleSet.defaultRole?.key !== memberRoleKey) {
    throw new Error("Clerk role set verification failed: the default role changed.");
  }
  if (roleSet.creatorRole?.key !== adminRoleKey) {
    throw new Error("Clerk role set verification failed: the creator role changed.");
  }
}

await removeLegacyPermission(permission);

for (const role of [verifiedAdminRole, verifiedOperatorRole].filter(Boolean)) {
  const keys = role.permissions.map((candidate) => candidate.key);
  if (!keys.includes(permissionDefinition.key)) {
    throw new Error(
      `Clerk RBAC verification failed: ${role.key} is missing ${permissionDefinition.key}.`,
    );
  }
}

const memberPermissionKeys = verifiedMemberRole.permissions.map(
  (candidate) => candidate.key,
);
if (memberPermissionKeys.includes(permissionDefinition.key)) {
  throw new Error(
    `Clerk RBAC verification failed: ${memberRoleKey} must not receive ${permissionDefinition.key} on Hobby.`,
  );
}

console.log(
  JSON.stringify(
    {
      mode: b2bMode ? "b2b" : "hobby",
      permission: { id: permission.id, key: permission.key },
      roles: [verifiedAdminRole, verifiedMemberRole, verifiedOperatorRole]
        .filter(Boolean)
        .map((role) => ({
          id: role.id,
          key: role.key,
          permissions: role.permissions.map((candidate) => candidate.key),
        })),
      roleSet: roleSet
        ? {
            id: roleSet.id,
            key: roleSet.key,
            defaultRole: roleSet.defaultRole?.key,
            creatorRole: roleSet.creatorRole?.key,
            roles: roleSet.roles.map((role) => role.key),
          }
        : null,
      notes: b2bMode
        ? [
            "B2B mode: org:admin and org:operator receive org:operations_hub:manage.",
            "org:member stays hub-less; invite operators with the Operator role.",
            "Billing / settings remain admin-gated in app code.",
          ]
        : [
            "Hobby mode: only org:admin receives org:operations_hub:manage.",
            "org:member has no hub access until promoted to admin.",
            "Set CLERK_B2B_AUTH=1 to provision org:operator for hub-only staff.",
            "Billing / settings stay admin-gated in app code.",
          ],
    },
    null,
    2,
  ),
);
