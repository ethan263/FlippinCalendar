import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  PLAN_INTENT_COOKIE,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { getClerkAuthorizedParties } from "@/lib/site";

const isAppRoute = createRouteMatcher(["/app(.*)"]);
const isBillingCheckout = createRouteMatcher([
  "/app/(.*)/billing",
]);

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
      // Production: pending sessions are signed-out (auth.protect default).
      // Development: allow pending via auth() so choose-organization can finish.
      // auth.protect() no longer accepts treatPendingAsSignedOut.
      if (process.env.NODE_ENV === "production") {
        await auth.protect();
      } else {
        const session = await auth({ treatPendingAsSignedOut: false });
        if (!session.userId) {
          await auth.protect();
        }
      }
    }

    return response;
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    authorizedParties: getClerkAuthorizedParties(),
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
