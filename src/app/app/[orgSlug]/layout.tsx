import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { requireAppSession } from "@/lib/auth/require-app-session";
import {
  requireCurrentOrganizationForRouteSlug,
  isWorkspaceOperator,
} from "@/lib/data/auth";
import { getOrganizationForRouteSlug } from "@/lib/data/organizations";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await requireAppSession();
  const { orgSlug: routeOrgSlug } = await params;

  if (session.orgId && session.orgSlug && session.orgSlug !== routeOrgSlug) {
    redirect(`/app/${session.orgSlug}`);
  }

  let routeOrganization:
    | Awaited<ReturnType<typeof requireCurrentOrganizationForRouteSlug>>["organization"]
    | null = null;

  try {
    const current = await requireCurrentOrganizationForRouteSlug(routeOrgSlug);
    routeOrganization = current.organization;
    if (!isWorkspaceOperator(current.auth)) {
      redirect("/app/access-required");
    }
  } catch {
    redirect("/app/access-required");
  }

  if (
    session.orgId &&
    routeOrganization.clerk_org_id &&
    routeOrganization.clerk_org_id !== session.orgId
  ) {
    redirect(`/app/${session.orgSlug ?? routeOrgSlug}`);
  }

  if (session.orgId && !routeOrganization.clerk_org_id) {
    const supabase = createAdminClient();
    const { data: activeOrg } = await supabase
      .from("organizations")
      .select("slug")
      .eq("clerk_org_id", session.orgId)
      .maybeSingle();
    if (activeOrg?.slug) {
      redirect(`/app/${activeOrg.slug as string}`);
    }
  }

  const initialOrganization = await getOrganizationForRouteSlug(routeOrgSlug).catch(
    () => null,
  );

  return (
    <AppShell orgSlug={routeOrgSlug} initialOrganization={initialOrganization}>
      {children}
    </AppShell>
  );
}
