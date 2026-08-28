/** OIDC prompt passed to Google OAuth so users can pick an account on every sign-in. */
export const CLERK_OIDC_ACCOUNT_PROMPT = "select_account" as const;

export const GOOGLE_OAUTH_STRATEGY = "oauth_google" as const;

/** Clerk OAuth callback route when using path-based sign-in routing. */
export const SIGN_IN_SSO_CALLBACK_PATH = "/sign-in/sso-callback" as const;
