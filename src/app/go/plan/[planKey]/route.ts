import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  PLAN_INTENT_COOKIE,
  buildBillingCheckoutUrl,
  buildSignUpUrl,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";
import { isFreePlan } from "@/lib/marketing/plans";

type RouteContext = {
  params: Promise<{ planKey: string }>;
};

function planCookie(value: string) {
  return {
    name: PLAN_INTENT_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { planKey } = await context.params;
  const planIntent = normalizePlanIntent(planKey);

  if (!planIntent) {
    return NextResponse.redirect(new URL("/pricing", _request.url));
  }

  const { userId, orgSlug } = await auth();
  const destination = !userId
    ? buildSignUpUrl(planIntent.key)
    : orgSlug
      ? buildBillingCheckoutUrl(orgSlug, planIntent)
      : `/app?plan=${encodeURIComponent(planIntent.key)}`;

  const response = NextResponse.redirect(new URL(destination, _request.url));

  if (isFreePlan(planIntent.key)) {
    response.cookies.delete(PLAN_INTENT_COOKIE);
  } else {
    response.cookies.set(planCookie(planIntent.key));
  }

  return response;
}
