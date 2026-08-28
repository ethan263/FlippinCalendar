import {
  marketingPlans,
  type MarketingPlan,
  type MarketingPlanKey,
  isFreePlan,
} from "@/lib/marketing/plans";
import { getAppOrigin } from "@/lib/site";

export type PlanIntent = Pick<MarketingPlan, "key" | "name">;

export const PLAN_INTENT_COOKIE = "fc_plan_intent";

export {
  CLERK_OIDC_ACCOUNT_PROMPT,
} from "@/lib/clerk/oauth";

const planByKey = new Map(
  marketingPlans.map((plan) => [plan.key, plan] as const),
);

/** Accept legacy Clerk slugs and retired tier names during transition. */
const legacySlugMap: Record<string, MarketingPlanKey> = {
  free_org: "core",
  free: "core",
  engage: "pro",
  voice: "pro",
};

export function normalizePlanIntent(
  value?: string | null,
): PlanIntent | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  const resolvedKey =
    (planByKey.has(trimmed as MarketingPlanKey)
      ? (trimmed as MarketingPlanKey)
      : legacySlugMap[trimmed]) ?? null;

  if (!resolvedKey) {
    return null;
  }

  const plan = planByKey.get(resolvedKey);
  if (!plan) {
    return null;
  }

  return {
    key: plan.key,
    name: plan.name,
  };
}

export function buildSignUpUrl(planKey: MarketingPlanKey): string {
  return `/sign-up?plan=${encodeURIComponent(planKey)}`;
}

export function buildSignInUrl(planKey: MarketingPlanKey): string {
  return `/sign-in?plan=${encodeURIComponent(planKey)}`;
}

export function buildAppEntryUrl(planIntent: PlanIntent | null): string {
  if (!planIntent) {
    return "/app";
  }

  return `/app?plan=${encodeURIComponent(planIntent.key)}`;
}

/** Absolute URL for Clerk OAuth redirectUrl / forceRedirectUrl. */
export function buildAuthCompleteUrl(planIntent: PlanIntent | null): string {
  return new URL(buildAppEntryUrl(planIntent), getAppOrigin()).href;
}

export function buildPostOrganizationUrl(
  orgSlug: string,
  planIntent: PlanIntent | null,
): string {
  if (!planIntent || isFreePlan(planIntent.key)) {
    return `/app/${orgSlug}`;
  }

  return buildBillingCheckoutUrl(orgSlug, planIntent);
}

export function buildAfterOrganizationUrl(planIntent: PlanIntent | null): string {
  if (!planIntent || isFreePlan(planIntent.key)) {
    return "/app/:slug";
  }

  return `/app/:slug/billing?plan=${encodeURIComponent(planIntent.key)}&upgrade=1`;
}

export function buildBillingCheckoutUrl(
  orgSlug: string,
  planIntent: PlanIntent,
): string {
  if (isFreePlan(planIntent.key)) {
    return `/app/${orgSlug}`;
  }

  return `/app/${orgSlug}/billing?plan=${encodeURIComponent(planIntent.key)}&upgrade=1`;
}

export function buildPlanChoiceHref(args: {
  planKey: MarketingPlanKey;
  signedIn?: boolean;
  orgSlug?: string | null;
}): string {
  void args.signedIn;
  void args.orgSlug;
  return `/go/plan/${encodeURIComponent(args.planKey)}`;
}
