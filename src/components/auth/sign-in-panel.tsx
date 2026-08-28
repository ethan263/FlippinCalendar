"use client";

import { SignIn } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";
import { CLERK_OIDC_ACCOUNT_PROMPT } from "@/lib/marketing/plan-intent";

type SignInPanelProps = {
  signUpUrl: string;
  redirectUrl: string;
};

export function SignInPanel({ signUpUrl, redirectUrl }: SignInPanelProps) {
  return (
    <ClerkAuthPanel label="Loading sign-in…">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={signUpUrl}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
        oidcPrompt={CLERK_OIDC_ACCOUNT_PROMPT}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full border border-black/10 bg-white p-6 shadow-none sm:rounded-xl",
            headerTitle: "sr-only",
            headerSubtitle: "sr-only",
            footer: "bg-transparent",
          },
        }}
      />
    </ClerkAuthPanel>
  );
}
