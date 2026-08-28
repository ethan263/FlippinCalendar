import { TaskChooseOrganization } from "@clerk/nextjs";
import { ContinueWhenOrganizationReady } from "@/components/auth/continue-when-organization-ready";
import { AuthShell } from "@/components/auth-shell";
import {
  buildAfterOrganizationUrl,
  buildPostOrganizationUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { readPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type ChooseOrganizationPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function ChooseOrganizationPage({
  searchParams,
}: ChooseOrganizationPageProps) {
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());

  return (
    <AuthShell title="Choose a business">
      <ContinueWhenOrganizationReady
        getDestination={(slug) => buildPostOrganizationUrl(slug, planIntent)}
      />
      <TaskChooseOrganization
        redirectUrlComplete={buildAfterOrganizationUrl(planIntent)}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full border-0 bg-transparent p-0 shadow-none",
            header: "hidden",
            footer: "bg-transparent",
          },
        }}
      />
    </AuthShell>
  );
}
