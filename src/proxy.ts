import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  PLAN_INTENT_COOKIE,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";

const isAppRoute = createRouteMatcher(["/app(.*)", "/session-tasks(.*)"]);
const isBillingCheckout = createRouteMatcher([
  "/app/(.*)/billing",
]);

export default clerkMiddleware(
  async (auth, req) => {
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
      await auth.protect();
    }

    return response;
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
