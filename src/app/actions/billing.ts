"use server";

import { auth } from "@clerk/nextjs/server";

import type { BillingPlanKey } from "@/lib/billing/features";
import { planIncludesFeature } from "@/lib/billing/features";
import {
  assertBillingCheckoutRateLimit,
} from "@/lib/billing/checkout-rate-limit";
import { buildCheckoutIdempotencyKey } from "@/lib/billing/yoco-metadata";
import { normalizeBillingPlanKey } from "@/lib/billing/plans";
import {
  getSubscriptionByClerkOrgId,
  setPendingCheckout,
  type OrganizationSubscription,
} from "@/lib/billing/subscriptions";
import { requireCurrentOrganizationAdminForRouteSlug } from "@/lib/data/auth";
import { reconcilePendingCheckout } from "@/lib/billing/reconcile-checkout";
import { createYocoCheckout } from "@/lib/yoco/checkout";

export async function fetchSubscriptionAction(): Promise<OrganizationSubscription | null> {
  const { orgId } = await auth();
  if (!orgId) return null;
  return getSubscriptionByClerkOrgId(orgId);
}

export async function fetchEntitlementsAction() {
  const { orgId } = await auth();
  if (!orgId) {
    return {
      isLoaded: true,
      plan: "core" as BillingPlanKey,
      pendingPlan: null as BillingPlanKey | null,
      webAgent: false,
      browserVoice: false,
      hasAiAgent: false,
    };
  }

  const subscription = await getSubscriptionByClerkOrgId(orgId);
  const plan = subscription?.plan ?? ("core" as BillingPlanKey);
  const pendingPlan = subscription?.pendingPlan ?? null;
  const active =
    subscription?.status === "active" ||
    subscription?.status === "pending" ||
    subscription?.status === "past_due" ||
    !subscription;

  const webAgent = active && planIncludesFeature(plan, "web_agent");
  const browserVoice = active && planIncludesFeature(plan, "browser_voice");

  return {
    isLoaded: true,
    plan,
    pendingPlan,
    webAgent,
    browserVoice,
    hasAiAgent: webAgent || browserVoice,
  };
}

export async function createYocoCheckoutAction(
  planKey: string,
  orgSlug: string,
) {
  const plan = normalizeBillingPlanKey(planKey);
  if (!plan || plan === "core") {
    throw new Error("Choose a paid plan to checkout.");
  }

  const routeOrgSlug = orgSlug.trim();
  if (!routeOrgSlug) {
    throw new Error("Business slug is required to start checkout.");
  }

  const { auth: clerkAuth, organization } =
    await requireCurrentOrganizationAdminForRouteSlug(routeOrgSlug);

  await assertBillingCheckoutRateLimit({
    organizationId: organization.id,
    userId: clerkAuth.userId,
  });

  const idempotencyKey = buildCheckoutIdempotencyKey(organization.id, plan);
  const { checkoutId, redirectUrl } = await createYocoCheckout({
    organizationId: organization.id,
    clerkOrgId: clerkAuth.clerkOrgId,
    orgSlug: organization.slug,
    plan,
    idempotencyKey,
  });

  await setPendingCheckout({
    organizationId: organization.id,
    plan,
    yocoCheckoutId: checkoutId,
  });

  return { redirectUrl, checkoutId };
}

export async function reconcilePendingCheckoutAction(orgSlug: string) {
  const routeOrgSlug = orgSlug.trim();
  if (!routeOrgSlug) {
    throw new Error("Business slug is required to reconcile checkout.");
  }

  const { organization } =
    await requireCurrentOrganizationAdminForRouteSlug(routeOrgSlug);
  return reconcilePendingCheckout(organization.id);
}
