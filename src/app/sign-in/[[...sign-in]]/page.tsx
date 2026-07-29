import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { AuthShell } from "@/components/auth-shell";
import {
  buildAppEntryUrl,
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
  const redirectUrl = buildAppEntryUrl(planIntent);
  const signUpUrl = planIntent
    ? `/sign-up?plan=${planIntent.key}`
    : "/sign-up";

  const session = await auth();
  if (session.userId) {
    redirect(redirectUrl);
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Open your workspace">
      <SignInPanel signUpUrl={signUpUrl} redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
