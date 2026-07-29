import "server-only";

import type { BillingFeature, BillingPlanKey } from "@/lib/billing/features";
import { planIncludesFeature } from "@/lib/billing/features";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubscriptionStatus = "active" | "pending" | "past_due" | "cancelled";

export type OrganizationSubscription = {
  organizationId: string;
  plan: BillingPlanKey;
  pendingPlan: BillingPlanKey | null;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  yocoCheckoutId: string | null;
  yocoPaymentId: string | null;
};

type SubscriptionRow = {
  organization_id: string;
  plan: BillingPlanKey;
  pending_plan?: BillingPlanKey | null;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  yoco_checkout_id: string | null;
  yoco_payment_id: string | null;
};

function mapRow(row: SubscriptionRow): OrganizationSubscription {
  return {
    organizationId: row.organization_id,
    plan: row.plan,
    pendingPlan: row.pending_plan ?? null,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    yocoCheckoutId: row.yoco_checkout_id,
    yocoPaymentId: row.yoco_payment_id,
  };
}

function subscriptionGrantsAccess(subscription: OrganizationSubscription): boolean {
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
  if (!subscription) {
    return planIncludesFeature("core", feature);
  }
  if (!subscriptionGrantsAccess(subscription)) {
    return false;
  }
  return planIncludesFeature(subscription.plan, feature);
}

export async function setPendingCheckout(args: {
  organizationId: string;
  plan: BillingPlanKey;
  yocoCheckoutId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("organization_subscriptions").upsert(
    {
      organization_id: args.organizationId,
      pending_plan: args.plan,
      status: "pending",
      yoco_checkout_id: args.yocoCheckoutId,
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
      yoco_checkout_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

export async function activatePaidSubscription(args: {
  organizationId: string;
  plan: BillingPlanKey;
  yocoCheckoutId?: string | null;
  yocoPaymentId?: string | null;
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
      yoco_checkout_id: args.yocoCheckoutId ?? null,
      yoco_payment_id: args.yocoPaymentId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) throw new Error(error.message);
}

export async function recordYocoBillingEvent(args: {
  yocoEventId: string;
  eventType: string;
  payload: unknown;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("yoco_billing_events").insert({
    yoco_event_id: args.yocoEventId,
    event_type: args.eventType,
    payload: args.payload,
  });
  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);
  return true;
}
