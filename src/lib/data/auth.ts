import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { BackendTerminology, Organization } from "@/components/dashboard/data";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrganizationRow = {
  id: string;
  clerk_org_id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  terminology: BackendTerminology;
  created_at: string;
  updated_at: string;
};

export type ActiveClerkOrganization = {
  clerkOrgId: string;
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
    clerkOrgId: row.clerk_org_id,
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

export async function requireActiveClerkOrganization(): Promise<ActiveClerkOrganization> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Authentication required.");
  }
  if (!session.orgId) {
    throw new Error(
      "Select an organization before using the workspace. The active Clerk session has no organization claim.",
    );
  }

  const role = session.orgRole?.startsWith("org:")
    ? session.orgRole.slice(4)
    : session.orgRole;

  const permissions: string[] = [];
  if (session.has?.({ permission: "org:operations_hub:manage" })) {
    permissions.push("org:operations_hub:manage");
  }

  return {
    clerkOrgId: session.orgId,
    clerkOrgSlug: session.orgSlug ?? undefined,
    role: role ?? undefined,
    userId: session.userId,
    permissions,
  };
}

export async function requireCurrentOrganization() {
  const clerkAuth = await requireActiveClerkOrganization();
  // Service role after Clerk verification: dashboard tenancy is enforced by
  // clerk_org_id / organization_id filters below, not by JWT RLS claims.
  // This keeps workspace sync working when Clerk session tokens lack
  // `role: authenticated` (required for Supabase third-party auth RLS).
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_org_id", clerkAuth.clerkOrgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "This organization has not been initialized yet. Run bootstrapCurrentOrganization first.",
    );
  }
  return {
    auth: clerkAuth,
    organization: data as OrganizationRow,
    supabase,
  };
}

export async function requireCurrentOrganizationAdmin() {
  const current = await requireCurrentOrganization();
  if (current.auth.role !== "admin" && current.auth.role !== "owner") {
    throw new Error("An organization admin role is required for this action.");
  }
  return current;
}

export async function requireCurrentOrganizationOperator() {
  const current = await requireCurrentOrganization();
  const isAdmin =
    current.auth.role === "admin" || current.auth.role === "owner";
  if (
    !isAdmin &&
    !current.auth.permissions.includes("org:operations_hub:manage")
  ) {
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
