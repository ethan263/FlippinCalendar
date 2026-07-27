import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { Organization } from "@/components/dashboard/data";
import {
  DEFAULT_TERMINOLOGY,
  assertIanaTimezone,
  defaultSiteConfig,
  optionalTrimmed,
  requiredTrimmed,
  slugify,
  type BackendTerminology,
} from "@/lib/data/shared";
import { createClient } from "@/lib/supabase/server";

type OrganizationRow = {
  id: string;
  clerk_org_id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  terminology: BackendTerminology;
  created_at: string;
  updated_at: string;
};

export type ActiveClerkOrganization = {
  clerkOrgId: string;
  clerkOrgSlug?: string;
  role?: string;
  userId: string;
};

function viewOrganization(
  row: OrganizationRow,
  role?: string,
): Organization {
  return {
    _id: row.id,
    clerkOrgId: row.clerk_org_id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    currency: row.currency,
    locale: row.locale,
    terminology: row.terminology,
    role,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function requireActiveClerkOrganization(): Promise<ActiveClerkOrganization> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Authentication required.");
  }

  const clerkOrgId = session.orgId;
  if (!clerkOrgId) {
    throw new Error(
      "Select an organization before using the workspace. The active Clerk session has no organization claim.",
    );
  }

  const role = session.orgRole?.startsWith("org:")
    ? session.orgRole.slice(4)
    : session.orgRole;

  return {
    clerkOrgId,
    clerkOrgSlug: session.orgSlug ?? undefined,
    role: role ?? undefined,
    userId: session.userId,
  };
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  const clerkAuth = await requireActiveClerkOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_org_id", clerkAuth.clerkOrgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return viewOrganization(data as OrganizationRow, clerkAuth.role);
}

export async function bootstrapCurrentOrganization(args: {
  name?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
}): Promise<Organization> {
  const clerkAuth = await requireActiveClerkOrganization();
  if (clerkAuth.role !== "admin" && clerkAuth.role !== "owner") {
    throw new Error("An organization admin must initialize this workspace.");
  }

  const existing = await getCurrentOrganization();
  if (existing) return existing;

  const name = requiredTrimmed(
    args.name ??
      clerkAuth.clerkOrgSlug
        ?.split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") ??
      "New organization",
    "name",
    120,
  );
  const timezone = optionalTrimmed(args.timezone, "timezone", 100) ?? "UTC";
  assertIanaTimezone(timezone);
  const currency = (args.currency ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a three-letter ISO 4217 code.");
  }
  const locale = optionalTrimmed(args.locale, "locale", 35) ?? "en-US";
  try {
    new Intl.Locale(locale);
  } catch {
    throw new Error(`Invalid locale: "${locale}".`);
  }

  const preferredSlug = slugify(clerkAuth.clerkOrgSlug ?? name);
  const supabase = await createClient();

  const { data: slugOwner, error: slugError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", preferredSlug)
    .maybeSingle();
  if (slugError) throw new Error(slugError.message);

  const slug = slugOwner
    ? `${preferredSlug}-${slugify(clerkAuth.clerkOrgId).slice(-8)}`
    : preferredSlug;

  const defaultAgentId = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim();
  if (defaultAgentId && defaultAgentId.length > 200) {
    throw new Error("ELEVENLABS_DEFAULT_AGENT_ID is invalid.");
  }

  const { data: organization, error: insertError } = await supabase
    .from("organizations")
    .insert({
      clerk_org_id: clerkAuth.clerkOrgId,
      name,
      slug,
      timezone,
      currency,
      locale,
      terminology: DEFAULT_TERMINOLOGY,
    })
    .select("*")
    .single();

  if (insertError) {
    // Concurrent bootstrap: return the row created by the other request.
    if (insertError.code === "23505") {
      const raced = await getCurrentOrganization();
      if (raced) return raced;
    }
    throw new Error(insertError.message);
  }

  const orgRow = organization as OrganizationRow;

  const [{ error: siteError }, { error: agentError }] = await Promise.all([
    supabase.from("public_sites").insert({
      organization_id: orgRow.id,
      site_slug: slug,
      draft: defaultSiteConfig(name),
    }),
    supabase.from("agent_integrations").insert({
      organization_id: orgRow.id,
      provider: "elevenlabs",
      web_agent_id: defaultAgentId || null,
      web_enabled: Boolean(defaultAgentId),
    }),
  ]);

  if (siteError) throw new Error(siteError.message);
  if (agentError) throw new Error(agentError.message);

  return viewOrganization(orgRow, clerkAuth.role);
}

export async function updateCurrentOrganization(args: {
  name?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  terminology?: BackendTerminology;
}): Promise<Organization> {
  const clerkAuth = await requireActiveClerkOrganization();
  if (clerkAuth.role !== "admin" && clerkAuth.role !== "owner") {
    throw new Error("An organization admin role is required for this action.");
  }

  const current = await getCurrentOrganization();
  if (!current) {
    throw new Error(
      "This organization has not been initialized yet. Run bootstrapCurrentOrganization first.",
    );
  }

  const timezone = args.timezone?.trim();
  if (timezone) assertIanaTimezone(timezone);
  const currency = args.currency?.trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a three-letter ISO 4217 code.");
  }
  const locale = optionalTrimmed(args.locale, "locale", 35);
  if (locale) {
    try {
      new Intl.Locale(locale);
    } catch {
      throw new Error(`Invalid locale: "${locale}".`);
    }
  }
  const terminology = args.terminology
    ? (Object.fromEntries(
        Object.entries(args.terminology).map(([key, value]) => [
          key,
          requiredTrimmed(value, `terminology.${key}`, 40),
        ]),
      ) as BackendTerminology)
    : undefined;

  const supabase = await createClient();

  if (timezone && timezone !== current.timezone) {
    const { count, error } = await supabase
      .from("availability_rules")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", current._id);
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 500) {
      throw new Error(
        "This organization has too many availability rules for an atomic timezone change.",
      );
    }
    const { error: updateRulesError } = await supabase
      .from("availability_rules")
      .update({ timezone, updated_at: new Date().toISOString() })
      .eq("organization_id", current._id);
    if (updateRulesError) throw new Error(updateRulesError.message);
  }

  if (currency && currency !== current.currency) {
    const { count, error } = await supabase
      .from("offerings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", current._id);
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 500) {
      throw new Error(
        "This organization has too many offerings for an atomic currency change.",
      );
    }
    const { error: updateOfferingsError } = await supabase
      .from("offerings")
      .update({ currency, updated_at: new Date().toISOString() })
      .eq("organization_id", current._id);
    if (updateOfferingsError) throw new Error(updateOfferingsError.message);
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: args.name
        ? requiredTrimmed(args.name, "name", 120)
        : current.name,
      timezone: timezone ?? current.timezone,
      currency: currency ?? current.currency,
      locale: locale ?? current.locale,
      terminology: terminology ?? current.terminology,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current._id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return viewOrganization(data as OrganizationRow, clerkAuth.role);
}
