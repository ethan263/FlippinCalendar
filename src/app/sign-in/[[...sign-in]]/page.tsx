import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { buildAppEntryUrl, normalizePlanIntent } from "@/lib/marketing/plan-intent";

type SignInPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { plan } = await searchParams;
  const planIntent = normalizePlanIntent(plan);
  const redirectUrl = buildAppEntryUrl(planIntent);

  return (
    <AuthShell eyebrow="Welcome back" title="Open your workspace">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={planIntent ? `/sign-up?plan=${planIntent.key}` : "/sign-up"}
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
