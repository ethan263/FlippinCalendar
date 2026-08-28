import { OrganizationList } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { requireAppSession } from "@/lib/auth/require-app-session";
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
  const { orgSlug } = await requireAppSession();
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());

  if (orgSlug) {
    redirect(
      planIntent
        ? buildBillingCheckoutUrl(orgSlug, planIntent)
        : `/app/${orgSlug}`,
    );
  }

  const afterOrganizationUrl = buildAfterOrganizationUrl(planIntent);

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand href="/app" />
        </div>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl={afterOrganizationUrl}
          afterSelectOrganizationUrl={afterOrganizationUrl}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full border border-black/10 bg-white shadow-none",
              organizationListCreateOrganizationActionButton:
                "border-primary/20 text-primary hover:bg-primary/5",
            },
          }}
        />
      </section>
    </main>
  );
}
