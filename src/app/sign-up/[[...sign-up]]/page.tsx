import { SignUp } from "@clerk/nextjs";
import { ContinueWhenOrganizationReady } from "@/components/auth/continue-when-organization-ready";
import { AuthShell } from "@/components/auth-shell";
import {
  buildAppEntryUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { readPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type SignUpPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());
  const redirectUrl = buildAppEntryUrl(planIntent);

  return (
    <AuthShell eyebrow="Start with the essentials" title="Create your account">
      <ContinueWhenOrganizationReady />
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={planIntent ? `/sign-in?plan=${planIntent.key}` : "/sign-in"}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
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
