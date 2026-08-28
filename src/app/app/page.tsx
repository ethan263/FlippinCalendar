import { redirect } from "next/navigation";

import { WorkspacePicker } from "@/components/auth/workspace-picker";
import { requireAppSession } from "@/lib/auth/require-app-session";
import {
  bootstrapCurrentOrganization,
  listAccessibleWorkspaces,
} from "@/lib/data/organizations";
import {
  buildAfterOrganizationUrl,
  buildBillingCheckoutUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { readPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type AppIndexPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function AppIndexPage({ searchParams }: AppIndexPageProps) {
  const session = await requireAppSession();
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());

  if (session.orgSlug) {
    redirect(
      planIntent
        ? buildBillingCheckoutUrl(session.orgSlug, planIntent)
        : `/app/${session.orgSlug}`,
    );
  }

  const workspaces = await listAccessibleWorkspaces(session.userId!);

  if (workspaces.length === 0) {
    const workspace = await bootstrapCurrentOrganization({
      timezone: "Africa/Johannesburg",
      locale: "en-ZA",
      currency: "ZAR",
    });
    redirect(
      planIntent
        ? buildBillingCheckoutUrl(workspace.slug, planIntent)
        : `/app/${workspace.slug}`,
    );
  }

  if (workspaces.length === 1) {
    const workspace = workspaces[0]!;
    redirect(
      planIntent
        ? buildBillingCheckoutUrl(workspace.slug, planIntent)
        : `/app/${workspace.slug}`,
    );
  }

  return (
    <WorkspacePicker
      workspaces={workspaces}
      afterOrganizationUrl={buildAfterOrganizationUrl(planIntent)}
    />
  );
}
