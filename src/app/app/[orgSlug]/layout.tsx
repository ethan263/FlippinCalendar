import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { requireAppSession } from "@/lib/auth/require-app-session";
import { getOrganizationForRouteSlug } from "@/lib/data/organizations";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await requireAppSession();
  const { orgSlug: routeOrgSlug } = await params;

  if (!session.orgId || !session.orgSlug) {
    redirect("/app");
  }

  if (session.orgSlug !== routeOrgSlug) {
    redirect(`/app/${session.orgSlug}`);
  }

  const canOperate =
    session.has({ permission: "org:operations_hub:manage" }) ||
    session.has({ role: "org:admin" }) ||
    session.has({ role: "org:owner" });
  if (!canOperate) {
    redirect("/app/access-required");
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
