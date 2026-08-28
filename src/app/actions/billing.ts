"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";

import type { BillingPlanKey } from "@/lib/billing/features";
import { getPlanEntitlements } from "@/lib/billing/features";
import {
  assertBillingCheckoutRateLimit,
} from "@/lib/billing/checkout-rate-limit";
import { buildCheckoutMPaymentId } from "@/lib/billing/payfast-metadata";
import { normalizeBillingPlanKey } from "@/lib/billing/plans";
import {
  ensureCoreSubscription,
  getSubscriptionByClerkOrgId,
  getSubscriptionByOrganizationId,
  setPendingCheckout,
  type OrganizationSubscription,
} from "@/lib/billing/subscriptions";
import { requireCurrentOrganizationAdminForRouteSlug } from "@/lib/data/auth";
import { reconcilePendingCheckout } from "@/lib/billing/reconcile-checkout";
import { createPayfastCheckout } from "@/lib/payfast/checkout";

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

  const entitlements = getPlanEntitlements(plan);
  const webAgent = active && entitlements.webAgent;
  const browserVoice = active && entitlements.browserVoice;

  return {
    isLoaded: true,
    plan,
    pendingPlan,
    webAgent,
    browserVoice,
    hasAiAgent: webAgent || browserVoice,
  };
}

async function resolvePayerProfile(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }

  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.trim();
  if (!email) {
    throw new Error("Add an email address to your account before checkout.");
  }

  const firstName = user.firstName?.trim() || "flippinCalendar";
  const lastName = user.lastName?.trim() || "Customer";

  return { email, firstName, lastName };
}

export async function createPayfastCheckoutAction(
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

  let subscription = await getSubscriptionByOrganizationId(organization.id);
  if (!subscription) {
    await ensureCoreSubscription(organization.id);
    subscription = await getSubscriptionByOrganizationId(organization.id);
  }

  if (
    subscription?.status === "active" &&
    subscription.plan === plan &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > Date.now()
  ) {
    throw new Error("This business is already on that plan.");
  }

  await assertBillingCheckoutRateLimit({
    organizationId: organization.id,
    userId: clerkAuth.userId,
  });

  const mPaymentId = buildCheckoutMPaymentId(organization.id, plan);
  const payer = await resolvePayerProfile(clerkAuth.userId);

  const checkout = await createPayfastCheckout({
    organizationId: organization.id,
    clerkOrgId: clerkAuth.clerkOrgId,
    orgSlug: organization.slug,
    plan,
    mPaymentId,
    payerEmail: payer.email,
    payerFirstName: payer.firstName,
    payerLastName: payer.lastName,
  });

  await setPendingCheckout({
    organizationId: organization.id,
    plan,
    payfastMPaymentId: mPaymentId,
  });

  return checkout;
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
