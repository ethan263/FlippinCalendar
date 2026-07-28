import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Require a signed-in session for `/app` routes.
 *
 * Clerk's `auth.protect()` no longer accepts `treatPendingAsSignedOut`.
 * In development we still allow pending sessions (choose-organization) via
 * `auth({ treatPendingAsSignedOut: false })` so local org selection is not
 * trapped. Production keeps the secure default (pending ≡ signed out).
 */
export async function requireAppSession() {
  if (process.env.NODE_ENV === "production") {
    return auth.protect();
  }

  const session = await auth({ treatPendingAsSignedOut: false });
  if (!session.userId) {
    redirect("/sign-in");
  }
  return session;
}
