"use client";

import { SignIn } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";
import { CLERK_OIDC_ACCOUNT_PROMPT } from "@/lib/clerk/oauth";

type SignInPanelProps = {
  signUpUrl: string;
  redirectUrl: string;
};

const signInAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border border-black/10 bg-white p-6 shadow-none sm:rounded-xl",
    footer: "bg-transparent",
  },
} as const;

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
        appearance={signInAppearance}
      />
    </ClerkAuthPanel>
  );
}
