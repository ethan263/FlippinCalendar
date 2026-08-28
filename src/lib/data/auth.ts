import "server-only";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

import type { BackendTerminology, Organization } from "@/components/dashboard/data";
import {
  MANAGE_OPERATIONS_PERMISSION,
  canAccessBillingAndSettings,
  isWorkspaceAdmin,
  isWorkspaceOperator,
  permissionsForMembershipRole,
} from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";

export {
  MANAGE_OPERATIONS_PERMISSION,
  canAccessBillingAndSettings,
  isWorkspaceAdmin,
  isWorkspaceOperator,
} from "@/lib/rbac";

export type OrganizationRow = {
  id: string;
  clerk_org_id: string | null;
  owner_clerk_user_id: string | null;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  terminology: BackendTerminology;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMode = "organization" | "personal";

export type ActiveClerkOrganization = {
  mode: WorkspaceMode;
  clerkOrgId?: string;
  clerkOrgSlug?: string;
  role?: string;
  userId: string;
  permissions: string[];
};

export function mapOrganization(
  row: OrganizationRow,
  role?: string,
): Organization {
  return {
    _id: row.id,
    clerkOrgId: row.clerk_org_id ?? undefined,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    currency: row.currency,
    locale: row.locale,
    terminology: row.terminology,
    role,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/** Clerk org when present; otherwise personal workspace scoped to the signed-in user. */
export async function requireActiveClerkOrganization(): Promise<ActiveClerkOrganization> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Authentication required.");
  }

  if (!session.orgId) {
    return {
      mode: "personal",
      userId: session.userId,
      role: "owner",
      permissions: [MANAGE_OPERATIONS_PERMISSION],
    };
  }

  const role = session.orgRole?.startsWith("org:")
    ? session.orgRole.slice(4)
    : session.orgRole;

  const permissions: string[] = [];
  if (session.has?.({ permission: MANAGE_OPERATIONS_PERMISSION })) {
    permissions.push(MANAGE_OPERATIONS_PERMISSION);
  } else {
    permissions.push(...permissionsForMembershipRole(role));
  }

  return {
    mode: "organization",
    clerkOrgId: session.orgId,
    clerkOrgSlug: session.orgSlug ?? undefined,
    role: role ?? undefined,
    userId: session.userId,
    permissions,
  };
}

async function lookupOrganizationForAuth(clerkAuth: ActiveClerkOrganization) {
  const supabase = createAdminClient();
  if (clerkAuth.mode === "organization" && clerkAuth.clerkOrgId) {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("clerk_org_id", clerkAuth.clerkOrgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as OrganizationRow | null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_clerk_user_id", clerkAuth.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OrganizationRow | null;
}

export async function requireCurrentOrganization() {
  const clerkAuth = await requireActiveClerkOrganization();
  // Service role after Clerk verification: dashboard tenancy is enforced by
  // clerk_org_id / owner_clerk_user_id filters below, not by JWT RLS claims.
  const data = await lookupOrganizationForAuth(clerkAuth);
  if (!data) {
    throw new Error(
      "This workspace has not been initialized yet. Run bootstrapCurrentOrganization first.",
    );
  }
  return {
    auth: clerkAuth,
    organization: data,
    supabase: createAdminClient(),
  };
}

export async function requireCurrentOrganizationAdmin() {
  const current = await requireCurrentOrganization();
  if (!isWorkspaceAdmin(current.auth)) {
    throw new Error("An organization admin role is required for this action.");
  }
  return current;
}

function normalizeClerkRole(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return role.startsWith("org:") ? role.slice(4) : role;
}

async function verifyClerkOrganizationMembership(args: {
  userId: string;
  clerkOrgId: string;
}): Promise<{ role: string; permissions: string[] }> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }

  const clerk = createClerkClient({ secretKey });
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId: args.userId,
    limit: 100,
  });
  const membership = memberships.data.find(
    (entry) => entry.organization.id === args.clerkOrgId,
  );
  if (!membership) {
    throw new Error("You are not a member of this business.");
  }

  const role = normalizeClerkRole(membership.role);
  if (!role) {
    throw new Error("Could not resolve your role for this business.");
  }

  return {
    role,
    permissions: permissionsForMembershipRole(role),
  };
}

/**
 * Resolve the workspace from the URL slug when Clerk's session token briefly
 * lacks an organization claim (common during server-action transitions).
 */
export async function requireCurrentOrganizationForRouteSlug(routeOrgSlug: string) {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Authentication required.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", routeOrgSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("This business was not found.");
  }

  const organization = data as OrganizationRow;

  if (organization.owner_clerk_user_id === session.userId) {
    return {
      auth: {
        mode: "personal",
        clerkOrgSlug: routeOrgSlug,
        role: "owner",
        userId: session.userId,
        permissions: [MANAGE_OPERATIONS_PERMISSION],
      } satisfies ActiveClerkOrganization,
      organization,
      supabase,
    };
  }

  const clerkOrgId = organization.clerk_org_id;
  if (!clerkOrgId) {
    throw new Error("You do not have access to this business.");
  }

  let role: string | undefined;
  const permissions: string[] = [];

  if (session.orgId) {
    if (session.orgId !== clerkOrgId) {
      throw new Error("Switch to this business before continuing.");
    }
    role = normalizeClerkRole(session.orgRole);
    if (session.has?.({ permission: MANAGE_OPERATIONS_PERMISSION })) {
      permissions.push(MANAGE_OPERATIONS_PERMISSION);
    } else {
      permissions.push(...permissionsForMembershipRole(role));
    }
  } else {
    const membership = await verifyClerkOrganizationMembership({
      userId: session.userId,
      clerkOrgId,
    });
    role = membership.role;
    permissions.push(...membership.permissions);
  }

  return {
    auth: {
      mode: "organization",
      clerkOrgId,
      clerkOrgSlug: routeOrgSlug,
      role,
      userId: session.userId,
      permissions,
    } satisfies ActiveClerkOrganization,
    organization,
    supabase,
  };
}

export async function requireCurrentOrganizationAdminForRouteSlug(
  routeOrgSlug: string,
) {
  const current = await requireCurrentOrganizationForRouteSlug(routeOrgSlug);
  if (!isWorkspaceAdmin(current.auth)) {
    throw new Error("An organization admin role is required for this action.");
  }
  return current;
}

export async function requireCurrentOrganizationOperator() {
  const current = await requireCurrentOrganization();
  if (!isWorkspaceOperator(current.auth)) {
    throw new Error(
      "The organization operator permission is required for this action.",
    );
  }
  return current;
}

export function ms(iso: string | null | undefined): number | undefined {
  if (!iso) return undefined;
  return new Date(iso).getTime();
}

export function iso(msValue: number): string {
  return new Date(msValue).toISOString();
}
