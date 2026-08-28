import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Read the Clerk session for `/app` routes.
 *
 * Personal workspaces do not require a Clerk organization or a completed
 * choose-organization session task — only `userId` matters. Pending sessions
 * still carry `userId`, so we must not treat them as signed-out here.
 */
export async function getAppAuthSession() {
  return auth({ treatPendingAsSignedOut: false });
}

/**
 * Require a signed-in session for `/app` routes.
 */
export async function requireAppSession() {
  const session = await getAppAuthSession();
  if (!session.userId) {
    redirect("/sign-in");
  }
  return session;
}
