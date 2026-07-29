import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SignUpPanel } from "@/components/auth/sign-up-panel";
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
  const signInUrl = planIntent
    ? `/sign-in?plan=${planIntent.key}`
    : "/sign-in";

  const session = await auth();
  if (session.userId) {
    redirect(redirectUrl);
  }

  return (
    <AuthShell eyebrow="Start with the essentials" title="Create your account">
      <SignUpPanel signInUrl={signInUrl} redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
