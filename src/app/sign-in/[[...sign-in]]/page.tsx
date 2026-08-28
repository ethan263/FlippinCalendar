import { redirect } from "next/navigation";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getAppAuthSession } from "@/lib/auth/require-app-session";
import { AuthShell } from "@/components/auth-shell";
import {
  buildAuthCompleteUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { readPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type SignInPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { plan } = await searchParams;
  const planIntent =
    normalizePlanIntent(plan) ?? (await readPlanIntentCookie());
  const redirectUrl = buildAuthCompleteUrl(planIntent);
  const signUpUrl = planIntent
    ? `/sign-up?plan=${planIntent.key}`
    : "/sign-up";

  const session = await getAppAuthSession();
  if (session.userId) {
    redirect(redirectUrl);
  }

  return (
    <AuthShell>
      <SignInPanel signUpUrl={signUpUrl} redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
