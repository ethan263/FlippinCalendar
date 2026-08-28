import { redirect } from "next/navigation";

import { SignUpPanel } from "@/components/auth/sign-up-panel";
import { getAppAuthSession } from "@/lib/auth/require-app-session";
import { AuthShell } from "@/components/auth-shell";
import {
  buildAuthCompleteUrl,
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
  const redirectUrl = buildAuthCompleteUrl(planIntent);
  const signInUrl = planIntent
    ? `/sign-in?plan=${planIntent.key}`
    : "/sign-in";

  const session = await getAppAuthSession();
  if (session.userId) {
    redirect(redirectUrl);
  }

  return (
    <AuthShell>
      <SignUpPanel signInUrl={signInUrl} redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
