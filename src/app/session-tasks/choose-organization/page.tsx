import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/auth/require-app-session";
import { listAccessibleWorkspaces } from "@/lib/data/organizations";
import {
  buildAppEntryUrl,
  buildPostOrganizationUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { readPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type ChooseOrganizationPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

/**
 * Personal workspaces do not require Clerk Organizations.
 * Skip the org-picker task and route into `/app`, which bootstraps or picks
 * the user's workspace.
 */
export default async function ChooseOrganizationPage({
  searchParams,
}: ChooseOrganizationPageProps) {
  const session = await requireAppSession();
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());

  const workspaces = await listAccessibleWorkspaces(session.userId!);

  if (workspaces.length === 1) {
    redirect(buildPostOrganizationUrl(workspaces[0]!.slug, planIntent));
  }

  if (workspaces.length > 1) {
    redirect(buildAppEntryUrl(planIntent));
  }

  redirect(buildAppEntryUrl(planIntent));
}
