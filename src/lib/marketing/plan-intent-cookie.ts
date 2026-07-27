import { cookies } from "next/headers";

import {
  PLAN_INTENT_COOKIE,
  normalizePlanIntent,
  type PlanIntent,
} from "@/lib/marketing/plan-intent";

export async function persistPlanIntentCookie(
  planIntent: PlanIntent | null,
): Promise<void> {
  // Cookie writes are only allowed in Route Handlers / Server Actions /
  // middleware. Prefer `/go/plan/[planKey]` or proxy.ts for writes.
  void planIntent;
}

export async function readPlanIntentCookie(): Promise<PlanIntent | null> {
  const store = await cookies();
  return normalizePlanIntent(store.get(PLAN_INTENT_COOKIE)?.value);
}

export async function clearPlanIntentCookie(): Promise<void> {
  // Deleting cookies must happen in middleware or a Route Handler.
  // proxy.ts clears the intent when billing checkout is opened.
}
