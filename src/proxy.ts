import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  PLAN_INTENT_COOKIE,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";

const isAppRoute = createRouteMatcher(["/app(.*)"]);
const isBillingCheckout = createRouteMatcher([
  "/app/(.*)/billing",
]);

function authorizedParties(): string[] | undefined {
  const fromEnv = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return undefined;
  }

  try {
    return [new URL(appUrl).origin];
  } catch {
    return undefined;
  }
}

export default clerkMiddleware(
  async (auth, req) => {
    // Clerk sometimes lands choose-organization with redirect_url pointing at
    // the task page itself. Rewrite that to /app so selecting an org can finish.
    if (
      req.nextUrl.pathname === "/sign-in/tasks/choose-organization" ||
      req.nextUrl.pathname === "/sign-up/tasks/choose-organization"
    ) {
      const redirectUrl = req.nextUrl.searchParams.get("redirect_url");
      const isCircular =
        !redirectUrl ||
        redirectUrl.includes("/sign-in/tasks/choose-organization") ||
        redirectUrl.includes("/sign-up/tasks/choose-organization") ||
        redirectUrl.includes("/session-tasks/choose-organization");

      if (isCircular) {
        const target = req.nextUrl.clone();
        target.searchParams.set(
          "redirect_url",
          new URL("/app", req.nextUrl.origin).toString(),
        );
        return NextResponse.redirect(target);
      }
    }

    // Do not auth.protect() /session-tasks — pending choose-organization
    // sessions must reach that page if it is still used; protect() treats
    // pending as signed-out and bounces users into a redirect loop.
    const planParam = req.nextUrl.searchParams.get("plan");
    const planIntent = normalizePlanIntent(planParam);
    const response = NextResponse.next();

    if (planIntent && planIntent.clerkPlanSlug !== "free_org") {
      response.cookies.set(PLAN_INTENT_COOKIE, planIntent.key, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }

    if (
      isBillingCheckout(req) &&
      req.nextUrl.searchParams.get("checkout") === "1"
    ) {
      response.cookies.delete(PLAN_INTENT_COOKIE);
    }

    if (isAppRoute(req)) {
      // Production: pending sessions are signed-out (default).
      // Development only: allow pending so local choose-organization debugging
      // is not trapped when Clerk leaves the session pending after org select.
      await auth.protect(
        process.env.NODE_ENV === "production"
          ? undefined
          : { treatPendingAsSignedOut: false },
      );
    }

    return response;
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    authorizedParties: authorizedParties(),
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
