import {
  marketingPlans,
  type MarketingPlan,
  type MarketingPlanKey,
} from "@/lib/marketing/plans";

export type PlanIntent = Pick<MarketingPlan, "key" | "name" | "clerkPlanSlug">;

const planByKey = new Map(
  marketingPlans.map((plan) => [plan.key, plan] as const),
);

const planByClerkSlug = new Map(
  marketingPlans.map((plan) => [plan.clerkPlanSlug, plan] as const),
);

export function normalizePlanIntent(
  value?: string | null,
): PlanIntent | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  const plan =
    planByKey.get(trimmed as MarketingPlanKey) ??
    planByClerkSlug.get(trimmed as MarketingPlan["clerkPlanSlug"]);

  if (!plan) {
    return null;
  }

  return {
    key: plan.key,
    name: plan.name,
    clerkPlanSlug: plan.clerkPlanSlug,
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

export function buildAfterOrganizationUrl(planIntent: PlanIntent | null): string {
  if (!planIntent || planIntent.clerkPlanSlug === "free_org") {
    return "/app/:slug";
  }

  return `/app/:slug/billing?plan=${encodeURIComponent(planIntent.key)}&checkout=1`;
}

export function buildBillingCheckoutUrl(
  orgSlug: string,
  planIntent: PlanIntent,
): string {
  if (planIntent.clerkPlanSlug === "free_org") {
    return `/app/${orgSlug}`;
  }

  return `/app/${orgSlug}/billing?plan=${encodeURIComponent(planIntent.key)}&checkout=1`;
}

export function buildPlanChoiceHref(args: {
  planKey: MarketingPlanKey;
  signedIn: boolean;
  orgSlug?: string | null;
}): string {
  const planIntent = normalizePlanIntent(args.planKey);
  if (!planIntent) {
    return args.signedIn ? "/app" : "/sign-up";
  }

  if (args.orgSlug) {
    return buildBillingCheckoutUrl(args.orgSlug, planIntent);
  }

  if (args.signedIn) {
    return buildAppEntryUrl(planIntent);
  }

  return buildSignUpUrl(planIntent.key);
}
