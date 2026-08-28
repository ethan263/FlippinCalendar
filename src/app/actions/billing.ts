"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";

import type { BillingPlanKey } from "@/lib/billing/features";
import {
  assertBillingCheckoutRateLimit,
} from "@/lib/billing/checkout-rate-limit";
import { buildCheckoutMPaymentId } from "@/lib/billing/payfast-metadata";
import {
  isCurrentOrHigherPlan,
  isUpgradeTarget,
  normalizeBillingPlanKey,
} from "@/lib/billing/plans";
import {
  ensureCoreSubscription,
  getSubscriptionByOrganizationId,
  resolveEntitlementsFromSubscription,
  setPendingCheckout,
  type OrganizationSubscription,
} from "@/lib/billing/subscriptions";
import { requireCurrentOrganizationAdminForRouteSlug } from "@/lib/data/auth";
import { getOrganizationForRouteSlug } from "@/lib/data/organizations";
import { reconcilePendingCheckout } from "@/lib/billing/reconcile-checkout";
import { createPayfastCheckout } from "@/lib/payfast/checkout";

async function resolveOrganizationForEntitlements(orgSlug?: string) {
  const routeOrgSlug = orgSlug?.trim();
  if (routeOrgSlug) {
    return getOrganizationForRouteSlug(routeOrgSlug);
  }

  const { orgId, userId } = await auth();
  if (orgId) {
    const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("clerk_org_id", orgId)
      .maybeSingle();
    if (data?.id) {
      return { _id: data.id as string };
    }
  }

  if (userId) {
    const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_clerk_user_id", userId)
      .maybeSingle();
    if (data?.id) {
      return { _id: data.id as string };
    }
  }

  return null;
}

export async function fetchSubscriptionAction(
  orgSlug?: string,
): Promise<OrganizationSubscription | null> {
  const organization = await resolveOrganizationForEntitlements(orgSlug);
  if (!organization?._id) return null;
  return getSubscriptionByOrganizationId(organization._id);
}

export async function fetchEntitlementsAction(orgSlug?: string) {
  const organization = await resolveOrganizationForEntitlements(orgSlug);
  if (!organization?._id) {
    return {
      isLoaded: true,
      plan: "core" as BillingPlanKey,
      pendingPlan: null as BillingPlanKey | null,
      webAgent: false,
      browserVoice: false,
      advancedAnalytics: false,
      hasAiAgent: false,
    };
  }

  const subscription = await getSubscriptionByOrganizationId(organization._id);
  const resolved = resolveEntitlementsFromSubscription(subscription);

  return {
    isLoaded: true,
    plan: resolved.plan,
    pendingPlan: resolved.pendingPlan,
    webAgent: resolved.webAgent,
    browserVoice: resolved.browserVoice,
    advancedAnalytics: resolved.advancedAnalytics,
    hasAiAgent: resolved.hasAiAgent,
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

  const periodActive =
    subscription?.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > Date.now();

  if (
    subscription?.status === "active" &&
    periodActive &&
    subscription.plan === plan
  ) {
    throw new Error("This business is already on that plan.");
  }

  if (
    subscription?.status === "active" &&
    periodActive &&
    !isUpgradeTarget(subscription.plan, plan)
  ) {
    throw new Error("This business is already on that plan or a higher one.");
  }

  await assertBillingCheckoutRateLimit({
    organizationId: organization.id,
    userId: clerkAuth.userId,
  });

  const mPaymentId = buildCheckoutMPaymentId(organization.id, plan);
  const payer = await resolvePayerProfile(clerkAuth.userId);

  const checkout = await createPayfastCheckout({
    organizationId: organization.id,
    clerkOrgId: clerkAuth.clerkOrgId ?? clerkAuth.userId,
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
