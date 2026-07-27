import { TaskChooseOrganization } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { buildAppEntryUrl, normalizePlanIntent } from "@/lib/marketing/plan-intent";

type ChooseOrganizationPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function ChooseOrganizationPage({
  searchParams,
}: ChooseOrganizationPageProps) {
  const { plan } = await searchParams;
  const planIntent = normalizePlanIntent(plan);

  return (
    <AuthShell eyebrow="One last step" title="Choose where you’re working">
      <TaskChooseOrganization
        redirectUrlComplete={buildAppEntryUrl(planIntent)}
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
