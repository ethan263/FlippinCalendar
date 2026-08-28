import "server-only";

import { revalidatePath } from "next/cache";

import type { BillingFeature, BillingPlanKey } from "@/lib/billing/features";
import { planIncludesFeature } from "@/lib/billing/features";
import { normalizeBillingPlanKey } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubscriptionStatus = "active" | "pending" | "past_due" | "cancelled";

export type OrganizationSubscription = {
  organizationId: string;
  plan: BillingPlanKey;
  pendingPlan: BillingPlanKey | null;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  payfastMPaymentId: string | null;
  payfastPaymentId: string | null;
};

type SubscriptionRow = {
  organization_id: string;
  plan: string;
  pending_plan?: string | null;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  payfast_m_payment_id: string | null;
  payfast_payment_id: string | null;
};

function mapRow(row: SubscriptionRow): OrganizationSubscription {
  return {
    organizationId: row.organization_id,
    plan: normalizeBillingPlanKey(row.plan) ?? "core",
    pendingPlan: row.pending_plan
      ? normalizeBillingPlanKey(row.pending_plan)
      : null,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    payfastMPaymentId: row.payfast_m_payment_id,
    payfastPaymentId: row.payfast_payment_id,
  };
}

export function subscriptionGrantsAccess(
  subscription: OrganizationSubscription,
): boolean {
  if (subscription.status === "active" || subscription.status === "pending") {
    return true;
  }
  if (
    subscription.status === "past_due" &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

export type ResolvedEntitlements = {
  plan: BillingPlanKey;
  pendingPlan: BillingPlanKey | null;
  webAgent: boolean;
  browserVoice: boolean;
  advancedAnalytics: boolean;
  hasAiAgent: boolean;
};

/** Single source of truth for plan + subscription status → feature access. */
export function resolveEntitlementsFromSubscription(
  subscription: OrganizationSubscription | null,
): ResolvedEntitlements {
  const plan = subscription?.plan ?? "core";
  const pendingPlan = subscription?.pendingPlan ?? null;
  const grantsAccess = subscription
    ? subscriptionGrantsAccess(subscription)
    : true;

  const webAgent =
    grantsAccess && planIncludesFeature(plan, "web_agent");
  const browserVoice =
    grantsAccess && planIncludesFeature(plan, "browser_voice");
  const advancedAnalytics =
    grantsAccess && planIncludesFeature(plan, "advanced_analytics");

  return {
    plan,
    pendingPlan,
    webAgent,
    browserVoice,
    advancedAnalytics,
    hasAiAgent: webAgent || browserVoice,
  };
}

export async function ensureCoreSubscription(organizationId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("organization_subscriptions").upsert(
    {
      organization_id: organizationId,
      plan: "core",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export async function getSubscriptionByOrganizationId(
  organizationId: string,
): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as SubscriptionRow);
}

export async function getSubscriptionByClerkOrgId(
  clerkOrgId: string,
): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();
  if (orgError) throw new Error(orgError.message);
  if (!org) return null;
  return getSubscriptionByOrganizationId(org.id as string);
}

export async function organizationHasFeature(
  clerkOrgId: string,
  feature: BillingFeature,
): Promise<boolean> {
  const subscription = await getSubscriptionByClerkOrgId(clerkOrgId);
  return subscriptionGrantsFeature(subscription, feature);
}

export async function organizationHasFeatureByOrganizationId(
  organizationId: string,
  feature: BillingFeature,
): Promise<boolean> {
  const subscription = await getSubscriptionByOrganizationId(organizationId);
  return subscriptionGrantsFeature(subscription, feature);
}

function subscriptionGrantsFeature(
  subscription: OrganizationSubscription | null,
  feature: BillingFeature,
): boolean {
  const entitlements = resolveEntitlementsFromSubscription(subscription);
  switch (feature) {
    case "web_agent":
      return entitlements.webAgent;
    case "browser_voice":
      return entitlements.browserVoice;
    case "advanced_analytics":
      return entitlements.advancedAnalytics;
    default:
      return false;
  }
}

export async function setPendingCheckout(args: {
  organizationId: string;
  plan: BillingPlanKey;
  payfastMPaymentId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("organization_subscriptions").upsert(
    {
      organization_id: args.organizationId,
      pending_plan: args.plan,
      status: "pending",
      payfast_m_payment_id: args.payfastMPaymentId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw new Error(error.message);
}

export async function abortPendingCheckout(organizationId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_subscriptions")
    .update({
      status: "active",
      pending_plan: null,
      payfast_m_payment_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

async function revalidateOrganizationBillingPaths(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !data?.slug) return;

  const slug = data.slug as string;
  revalidatePath(`/app/${slug}/billing`);
  revalidatePath(`/app/${slug}/voice-agent`);
  revalidatePath(`/app/${slug}`);
}

export async function activatePaidSubscription(args: {
  organizationId: string;
  plan: BillingPlanKey;
  payfastMPaymentId?: string | null;
  payfastPaymentId?: string | null;
}) {
  const supabase = createAdminClient();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { error } = await supabase.from("organization_subscriptions").upsert(
    {
      organization_id: args.organizationId,
      plan: args.plan,
      pending_plan: null,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      payfast_m_payment_id: args.payfastMPaymentId ?? null,
      payfast_payment_id: args.payfastPaymentId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw new Error(error.message);
  await revalidateOrganizationBillingPaths(args.organizationId);
}

export async function recordPayfastBillingEvent(args: {
  pfPaymentId: string;
  mPaymentId?: string | null;
  eventType: string;
  payload: unknown;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("payfast_billing_events").insert({
    pf_payment_id: args.pfPaymentId,
    m_payment_id: args.mPaymentId ?? null,
    event_type: args.eventType,
    payload: args.payload,
  });
  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);
  return true;
}
