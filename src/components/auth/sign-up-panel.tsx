"use client";

import { SignUp } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";
import { CLERK_OIDC_ACCOUNT_PROMPT } from "@/lib/clerk/oauth";

type SignUpPanelProps = {
  signInUrl: string;
  redirectUrl: string;
};

const signUpAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border border-black/10 bg-white p-6 shadow-none sm:rounded-xl",
    footer: "bg-transparent",
  },
} as const;

export function SignUpPanel({ signInUrl, redirectUrl }: SignUpPanelProps) {
  return (
    <ClerkAuthPanel label="Loading sign-up…">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={signInUrl}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
        oidcPrompt={CLERK_OIDC_ACCOUNT_PROMPT}
        appearance={signUpAppearance}
      />
    </ClerkAuthPanel>
  );
}
