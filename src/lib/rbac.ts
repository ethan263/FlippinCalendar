export const MANAGE_OPERATIONS_PERMISSION = "org:operations_hub:manage";

export type WorkspaceAuthRole = {
  mode?: "personal" | "organization";
  role?: string;
  permissions?: readonly string[];
  clerkOrgId?: string | null;
};

/** Workspace owner or Clerk org admin — billing, settings, member management. */
export function isWorkspaceAdmin(auth: WorkspaceAuthRole): boolean {
  if (auth.mode === "personal" || !auth.clerkOrgId) {
    return true;
  }
  return auth.role === "admin" || auth.role === "owner";
}

/** Can use the operations hub (bookings, offerings, agent, public site). */
export function isWorkspaceOperator(auth: WorkspaceAuthRole): boolean {
  if (auth.mode === "personal" || !auth.clerkOrgId) {
    return true;
  }
  if (isWorkspaceAdmin(auth)) {
    return true;
  }
  if (auth.role === "operator") {
    return true;
  }
  return auth.permissions?.includes(MANAGE_OPERATIONS_PERMISSION) ?? false;
}

export function canAccessBillingAndSettings(auth: WorkspaceAuthRole): boolean {
  return isWorkspaceAdmin(auth);
}

/** Infer hub permissions from a Clerk membership role when JWT claims are absent. */
export function permissionsForMembershipRole(role: string | undefined): string[] {
  if (!role) return [];
  if (role === "admin" || role === "owner" || role === "operator") {
    return [MANAGE_OPERATIONS_PERMISSION];
  }
  return [];
}
