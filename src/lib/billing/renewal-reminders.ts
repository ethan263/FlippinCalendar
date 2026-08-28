import "server-only";

import { createClerkClient } from "@clerk/backend";

import { billingPlanAmountCents } from "@/lib/billing/plans";
import type { BillingPlanKey } from "@/lib/billing/features";
import { sendResendEmail } from "@/lib/email/resend";
import { getAppOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const REMINDER_WINDOW_DAYS = 7;

type RenewalCandidate = {
  organizationId: string;
  clerkOrgId: string;
  orgName: string;
  orgSlug: string;
  plan: BillingPlanKey;
  currentPeriodEnd: string;
};

function formatZar(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

async function listRenewalCandidates(): Promise<RenewalCandidate[]> {
  const supabase = createAdminClient();
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);

  const { data, error } = await supabase
    .from("organization_subscriptions")
    .select(
      `
      organization_id,
      plan,
      current_period_end,
      renewal_reminder_sent_at,
      organizations!inner (
        clerk_org_id,
        name,
        slug
      )
    `,
    )
    .neq("plan", "core")
    .in("status", ["active", "past_due"])
    .not("current_period_end", "is", null)
    .lte("current_period_end", windowEnd.toISOString())
    .or(
      `renewal_reminder_sent_at.is.null,renewal_reminder_sent_at.lt.${new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()}`,
    );

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const org = row.organizations as
      | { clerk_org_id: string; name: string; slug: string }
      | { clerk_org_id: string; name: string; slug: string }[]
      | null;
    const organization = Array.isArray(org) ? org[0] : org;
    if (!organization || !row.current_period_end) return [];

    return [
      {
        organizationId: row.organization_id as string,
        clerkOrgId: organization.clerk_org_id,
        orgName: organization.name,
        orgSlug: organization.slug,
        plan: row.plan as BillingPlanKey,
        currentPeriodEnd: row.current_period_end as string,
      },
    ];
  });
}

async function getOrganizationAdminEmails(clerkOrgId: string): Promise<string[]> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    console.warn("[renewal] CLERK_SECRET_KEY not set — cannot resolve admin emails.");
    return [];
  }

  const clerk = createClerkClient({ secretKey });
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
    limit: 100,
  });

  const emails = new Set<string>();
  for (const membership of memberships.data) {
    if (!membership.role.startsWith("org:admin")) continue;
    const userId = membership.publicUserData?.userId;
    if (!userId) continue;
    const user = await clerk.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress?.trim();
    if (email) emails.add(email);
  }

  return [...emails];
}

async function markPastDueSubscriptions() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("organization_subscriptions")
    .update({ status: "past_due", updated_at: now })
    .neq("plan", "core")
    .eq("status", "active")
    .lt("current_period_end", now);

  if (error) throw new Error(error.message);
}

async function markReminderSent(organizationId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_subscriptions")
    .update({
      renewal_reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

export async function runBillingRenewalReminders(): Promise<{
  candidates: number;
  emailed: number;
  skipped: number;
}> {
  await markPastDueSubscriptions();

  const candidates = await listRenewalCandidates();
  let emailed = 0;
  let skipped = 0;

  const origin = getAppOrigin();

  for (const candidate of candidates) {
    const recipients = await getOrganizationAdminEmails(candidate.clerkOrgId);
    if (recipients.length === 0) {
      skipped += 1;
      continue;
    }

    const billingUrl = `${origin}/app/${candidate.orgSlug}/billing`;
    const amount = formatZar(billingPlanAmountCents[candidate.plan]);
    const periodEnd = formatDate(candidate.currentPeriodEnd);
    const planLabel = candidate.plan.charAt(0).toUpperCase() + candidate.plan.slice(1);

    const subject = `${candidate.orgName}: renew your ${planLabel} plan before ${periodEnd}`;
    const text = [
      `Hi,`,
      ``,
      `Your flippinCalendar ${planLabel} plan (${amount}/month) renews on ${periodEnd}.`,
      `PayFast does not auto-renew — open billing to complete checkout and keep Pro features active:`,
      billingUrl,
      ``,
      `— flippinCalendar`,
    ].join("\n");

    const html = `
      <p>Hi,</p>
      <p>Your <strong>${candidate.orgName}</strong> ${planLabel} plan (${amount}/month) renews on <strong>${periodEnd}</strong>.</p>
      <p>PayFast does not auto-renew. Complete checkout before the period ends to keep your features active.</p>
      <p><a href="${billingUrl}">Renew on the billing page</a></p>
      <p>— flippinCalendar</p>
    `.trim();

    const sent = await sendResendEmail({
      to: recipients,
      subject,
      html,
      text,
    });

    if (sent) {
      await markReminderSent(candidate.organizationId);
      emailed += 1;
    } else {
      skipped += 1;
    }
  }

  return { candidates: candidates.length, emailed, skipped };
}
