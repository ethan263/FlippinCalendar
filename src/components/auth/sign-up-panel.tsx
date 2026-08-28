"use client";

import { SignUp } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { CLERK_OIDC_ACCOUNT_PROMPT } from "@/lib/clerk/oauth";

type SignUpPanelProps = {
  signInUrl: string;
  redirectUrl: string;
};

export function SignUpPanel({ signInUrl, redirectUrl }: SignUpPanelProps) {
  return (
    <ClerkAuthPanel label="Loading sign-up…">
      <div className="space-y-4">
        <GoogleOAuthButton mode="sign-up" redirectUrl={redirectUrl} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-black/10" />
          </div>
          <p className="relative mx-auto w-fit bg-background px-3 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Or continue with email
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl={signInUrl}
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
              socialButtons: "hidden",
              socialButtonsBlockButton: "hidden",
              dividerRow: "hidden",
            },
          }}
        />
      </div>
    </ClerkAuthPanel>
  );
}
