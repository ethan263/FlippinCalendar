import "server-only";

import { revalidatePath } from "next/cache";

import { sanitizeSiteConfig } from "@/lib/data/site-config";
import { requiredTrimmed, slugify } from "@/lib/data/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { ms, type OrganizationRow } from "@/lib/data/auth";
import type { SiteConfig } from "@/components/dashboard/data";
import {
  isWorkspaceOperator,
  requireCurrentOrganizationForRouteSlug,
} from "@/lib/data/auth";
import type { OfferingRow, TeamMemberRow } from "@/lib/data/booking-helpers";

type PublicSiteRow = {
  id: string;
  organization_id: string;
  site_slug: string;
  draft: SiteConfig;
  published: SiteConfig | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPublishedBySlug(siteSlugRaw: string) {
  const supabase = createAdminClient();
  const siteSlug = siteSlugRaw.trim().toLowerCase();
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("*")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const siteRow = site as PublicSiteRow | null;
  if (!siteRow?.published || !siteRow.published_at) return null;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", siteRow.organization_id)
    .maybeSingle();
  if (orgError) throw new Error(orgError.message);
  if (!organization) return null;
  const org = organization as OrganizationRow;

  const [offeringsRes, teamRes, knowledgeRes, hoursRes] = await Promise.all([
    supabase
      .from("offerings")
      .select("*")
      .eq("organization_id", org.id)
      .eq("active", true)
      .limit(201),
    supabase
      .from("team_members")
      .select("*")
      .eq("organization_id", org.id)
      .eq("active", true)
      .limit(201),
    supabase
      .from("knowledge_items")
      .select("*")
      .eq("organization_id", org.id)
      .eq("published", true)
      .limit(201),
    supabase
      .from("availability_rules")
      .select("day_of_week, start_minute, end_minute, active")
      .eq("organization_id", org.id)
      .eq("active", true)
      .limit(1_001),
  ]);
  for (const result of [offeringsRes, teamRes, knowledgeRes, hoursRes]) {
    if (result.error) throw new Error(result.error.message);
  }
  const offerings = (offeringsRes.data ?? []) as OfferingRow[];
  const teamMembers = (teamRes.data ?? []) as TeamMemberRow[];
  const knowledgeItems = knowledgeRes.data ?? [];
  const hourRows = (hoursRes.data ?? []) as Array<{
    day_of_week: number;
    start_minute: number;
    end_minute: number;
    active: boolean;
  }>;
  if (
    offerings.length > 200 ||
    teamMembers.length > 200 ||
    knowledgeItems.length > 200
  ) {
    throw new Error("Published site content limit exceeded.");
  }

  const dayLabels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const hoursByDay = new Map<
    number,
    Array<{ startMinute: number; endMinute: number }>
  >();
  for (const row of hourRows) {
    const ranges = hoursByDay.get(row.day_of_week) ?? [];
    const exists = ranges.some(
      (range) =>
        range.startMinute === row.start_minute &&
        range.endMinute === row.end_minute,
    );
    if (!exists) {
      ranges.push({
        startMinute: row.start_minute,
        endMinute: row.end_minute,
      });
      hoursByDay.set(row.day_of_week, ranges);
    }
  }
  const weeklyHours = [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => hoursByDay.has(day))
    .map((day) => ({
      dayOfWeek: day,
      label: dayLabels[day] ?? `Day ${day}`,
      ranges: (hoursByDay.get(day) ?? []).sort(
        (a, b) => a.startMinute - b.startMinute,
      ),
    }));

  return {
    site: {
      _id: siteRow.id,
      siteSlug: siteRow.site_slug,
      config: siteRow.published,
      publishedAt: ms(siteRow.published_at)!,
    },
    organization: {
      id: org.id,
      clerkOrgId: org.clerk_org_id ?? undefined,
      name: org.name,
      slug: org.slug,
      timezone: org.timezone,
      currency: org.currency,
      locale: org.locale,
      terminology: org.terminology,
    },
    offerings: offerings
      .filter((offering) => offering.bookable_online)
      .map((offering) => ({
        _id: offering.id,
        name: offering.name,
        slug: offering.slug,
        description: offering.description,
        category: offering.category,
        durationMinutes: offering.duration_minutes,
        priceMinor: offering.price_minor,
        currency: offering.currency,
        active: offering.active,
      })),
    teamMembers: teamMembers
      .filter((member) => member.accepting_bookings)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((member) => ({
        _id: member.id,
        name: member.name,
        title: member.title,
        bio: member.bio,
        imageUrl: member.image_url ?? undefined,
        offeringIds: member.offering_ids,
        active: member.active,
      })),
    knowledgeItems: knowledgeItems
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        _id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
      })),
    weeklyHours,
  };
}

async function requirePublicSiteOperator(routeOrgSlug: string) {
  const current = await requireCurrentOrganizationForRouteSlug(routeOrgSlug);
  if (!isWorkspaceOperator(current.auth)) {
    throw new Error(
      "The organization operator permission is required for this action.",
    );
  }
  return current;
}

/** Published catalog + site slug for dashboard agent client tools. */
export async function getAgentClientToolContext(routeOrgSlug: string) {
  const { organization, supabase } = await requirePublicSiteOperator(routeOrgSlug);
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("site_slug")
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!site?.site_slug) {
    throw new Error("Public site not initialized.");
  }

  const published = await getPublishedBySlug(site.site_slug as string);
  if (!published) {
    throw new Error(
      "Publish your public page before testing booking tools with the agent.",
    );
  }

  return {
    siteSlug: published.site.siteSlug,
    businessName:
      published.site.config.businessName.trim() || organization.name,
    offerings: published.offerings,
    teamMembers: published.teamMembers,
    timezone: published.organization.timezone,
    locale: published.organization.locale,
  };
}

export async function getAgentSessionConfig(siteSlugRaw: string) {
  const supabase = createAdminClient();
  const siteSlug = siteSlugRaw.trim().toLowerCase();
  const { data: site } = await supabase
    .from("public_sites")
    .select("*")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  const siteRow = site as PublicSiteRow | null;
  if (
    !siteRow?.published ||
    !siteRow.published_at ||
    (!siteRow.published.agent.showWebChat &&
      !siteRow.published.agent.showVoiceChat &&
      !siteRow.published.agent.showElevenLabsWidget)
  ) {
    return null;
  }
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", siteRow.organization_id)
    .maybeSingle();
  if (!organization) return null;
  const org = organization as OrganizationRow;
  const { data: integration } = await supabase
    .from("agent_integrations")
    .select("*")
    .eq("organization_id", org.id)
    .eq("provider", "elevenlabs")
    .maybeSingle();
  if (!integration?.web_enabled) return null;
  return { organizationId: org.id, siteSlug: siteRow.site_slug };
}

export async function getCurrentDraft(routeOrgSlug: string) {
  const { organization, supabase } = await requirePublicSiteOperator(routeOrgSlug);
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!site) throw new Error("Public site not initialized.");
  const siteRow = site as PublicSiteRow;
  return {
    site: {
      _id: siteRow.id,
      siteSlug: siteRow.site_slug,
      draft: siteRow.draft,
      published: siteRow.published ?? undefined,
      publishedAt: ms(siteRow.published_at),
      updatedAt: ms(siteRow.updated_at)!,
    },
    organization: {
      name: organization.name,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
      terminology: organization.terminology,
    },
  };
}

export async function updateDraft(args: {
  routeOrgSlug: string;
  config: SiteConfig;
  siteSlug?: string;
}) {
  const { organization, supabase } = await requirePublicSiteOperator(
    args.routeOrgSlug,
  );
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!site) throw new Error("Public site not initialized.");
  const siteRow = site as PublicSiteRow;
  const previousSlug = siteRow.site_slug;

  let nextSlug = siteRow.site_slug;
  if (args.siteSlug !== undefined) {
    nextSlug = slugify(requiredTrimmed(args.siteSlug, "siteSlug", 80));
    const { data: existing } = await supabase
      .from("public_sites")
      .select("id")
      .eq("site_slug", nextSlug)
      .maybeSingle();
    if (existing && existing.id !== siteRow.id) {
      throw new Error("That public site slug is already in use.");
    }
  }

  const { data, error: updateError } = await supabase
    .from("public_sites")
    .update({
      site_slug: nextSlug,
      draft: sanitizeSiteConfig(args.config),
      updated_at: new Date().toISOString(),
    })
    .eq("id", siteRow.id)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/p/${nextSlug}`);
  if (previousSlug !== nextSlug) {
    revalidatePath(`/p/${previousSlug}`);
  }
  if (organization.slug) {
    revalidatePath(`/app/${organization.slug}/public-site`);
    revalidatePath(`/app/${organization.slug}/voice-agent`);
  }

  return data as PublicSiteRow;
}

export async function publish(routeOrgSlug: string) {
  const { organization, supabase } = await requirePublicSiteOperator(routeOrgSlug);
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!site) throw new Error("Public site not initialized.");
  const siteRow = site as PublicSiteRow;
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("public_sites")
    .update({
      published: siteRow.draft,
      published_at: now,
      updated_at: now,
    })
    .eq("id", siteRow.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/p/${siteRow.site_slug}`);
  if (organization.slug) {
    revalidatePath(`/app/${organization.slug}/public-site`);
    revalidatePath(`/app/${organization.slug}/voice-agent`);
  }
  return {
    siteSlug: siteRow.site_slug,
    publishedAt: ms(now)!,
    config: siteRow.draft,
  };
}
