import { cookies } from "next/headers";

import {
  PLAN_INTENT_COOKIE,
  normalizePlanIntent,
  type PlanIntent,
} from "@/lib/marketing/plan-intent";

export async function persistPlanIntentCookie(
  planIntent: PlanIntent | null,
): Promise<void> {
  const store = await cookies();
  if (!planIntent || planIntent.clerkPlanSlug === "free_org") {
    store.delete(PLAN_INTENT_COOKIE);
    return;
  }

  store.set(PLAN_INTENT_COOKIE, planIntent.key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function readPlanIntentCookie(): Promise<PlanIntent | null> {
  const store = await cookies();
  return normalizePlanIntent(store.get(PLAN_INTENT_COOKIE)?.value);
}

export async function clearPlanIntentCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PLAN_INTENT_COOKIE);
}
