"use client";

import { SignIn } from "@clerk/nextjs";

import { ClerkAuthPanel } from "@/components/auth/clerk-auth-panel";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { CLERK_OIDC_ACCOUNT_PROMPT } from "@/lib/clerk/oauth";

type SignInPanelProps = {
  signUpUrl: string;
  redirectUrl: string;
};

const emailSignInAppearance = {
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
} as const;

export function SignInPanel({ signUpUrl, redirectUrl }: SignInPanelProps) {
  return (
    <ClerkAuthPanel label="Loading sign-in…">
      <div className="min-h-[280px] space-y-4">
        <GoogleOAuthButton mode="sign-in" redirectUrl={redirectUrl} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-black/10" />
          </div>
          <p className="relative mx-auto w-fit bg-background px-3 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Or continue with email
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl={signUpUrl}
          forceRedirectUrl={redirectUrl}
          fallbackRedirectUrl={redirectUrl}
          oidcPrompt={CLERK_OIDC_ACCOUNT_PROMPT}
          appearance={emailSignInAppearance}
        />
      </div>
    </ClerkAuthPanel>
  );
}
