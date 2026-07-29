"use client";

import { SignUp } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";

type SignUpPanelProps = {
  signInUrl: string;
  redirectUrl: string;
};

export function SignUpPanel({ signInUrl, redirectUrl }: SignUpPanelProps) {
  return (
    <ClerkAuthPanel label="Loading sign-up…">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={signInUrl}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
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
