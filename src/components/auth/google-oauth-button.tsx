"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CLERK_OIDC_ACCOUNT_PROMPT,
  GOOGLE_OAUTH_STRATEGY,
  SIGN_IN_SSO_CALLBACK_PATH,
} from "@/lib/clerk/oauth";

type GoogleOAuthButtonProps = {
  mode: "sign-in" | "sign-up";
  redirectUrl: string;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleOAuthButton({ mode, redirectUrl }: GoogleOAuthButtonProps) {
  const { isLoaded } = useAuth();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady =
    isLoaded &&
    (mode === "sign-in" ? signIn !== null : signUp !== null) &&
    (mode === "sign-in" ? signInStatus : signUpStatus) === "idle";

  async function handleGoogle() {
    if (!isReady || isLoading) return;

    setIsLoading(true);
    setError(null);

    const redirectCallbackUrl = new URL(
      SIGN_IN_SSO_CALLBACK_PATH,
      window.location.origin,
    ).href;

    try {
      if (mode === "sign-in") {
        if (!signIn) return;
        const { error: ssoError } = await signIn.sso({
          strategy: GOOGLE_OAUTH_STRATEGY,
          redirectUrl,
          redirectCallbackUrl,
          oidcPrompt: CLERK_OIDC_ACCOUNT_PROMPT,
        });
        if (ssoError) {
          setError(ssoError.message ?? "Google sign-in failed.");
          setIsLoading(false);
        }
        return;
      }

      if (!signUp) return;
      const { error: ssoError } = await signUp.sso({
        strategy: GOOGLE_OAUTH_STRATEGY,
        redirectUrl,
        redirectCallbackUrl,
        oidcPrompt: CLERK_OIDC_ACCOUNT_PROMPT,
      });
      if (ssoError) {
        setError(ssoError.message ?? "Google sign-up failed.");
        setIsLoading(false);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Google sign-in failed.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 bg-white shadow-none"
        disabled={!isReady || isLoading}
        onClick={() => void handleGoogle()}
      >
        {isLoading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>
      {error ? (
        <p className="text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
