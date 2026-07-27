import "server-only";

import type { TeamMember } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator } from "@/lib/data/auth";
import {
  mapTeamMember,
  requireOfferingForOrganization,
  requireTeamMemberForOrganization,
  type TeamMemberRow,
} from "@/lib/data/booking-helpers";
import {
  normalizedEmail,
  optionalTrimmed,
  requiredTrimmed,
} from "@/lib/data/shared";

async function validateOfferingIds(
  supabase: Awaited<
    ReturnType<typeof requireCurrentOrganizationOperator>
  >["supabase"],
  organizationId: string,
  offeringIds: string[],
) {
  const uniqueIds = [...new Set(offeringIds)];
  if (uniqueIds.length > 100) {
    throw new Error("A team member can have at most 100 offerings.");
  }
  for (const offeringId of uniqueIds) {
    await requireOfferingForOrganization(supabase, organizationId, offeringId);
  }
  return uniqueIds;
}

export async function listMembers(args: {
  includeInactive?: boolean;
} = {}): Promise<TeamMember[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  let query = supabase
    .from("team_members")
    .select("*")
    .eq("organization_id", organization.id)
    .limit(501);
  if (!args.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as TeamMemberRow[];
  if (rows.length > 500) throw new Error("Team member limit exceeded.");
  return rows
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    )
    .map(mapTeamMember);
}

export async function createMember(args: {
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  offeringIds: string[];
  active?: boolean;
  acceptingBookings?: boolean;
  sortOrder?: number;
}): Promise<TeamMember> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const offeringIds = await validateOfferingIds(
    supabase,
    organization.id,
    args.offeringIds,
  );
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      organization_id: organization.id,
      name: requiredTrimmed(args.name, "name", 120),
      title: optionalTrimmed(args.title, "title", 120) ?? "Team member",
      bio: optionalTrimmed(args.bio, "bio", 2_000) ?? "",
      email: normalizedEmail(args.email) ?? null,
      phone: optionalTrimmed(args.phone, "phone", 40) ?? null,
      image_url: optionalTrimmed(args.imageUrl, "imageUrl", 2_000) ?? null,
      offering_ids: offeringIds,
      active: args.active ?? true,
      accepting_bookings: args.acceptingBookings ?? true,
      sort_order: args.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapTeamMember(data as TeamMemberRow);
}

export async function updateMember(args: {
  teamMemberId: string;
  name?: string;
  title?: string;
  bio?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  offeringIds?: string[];
  active?: boolean;
  acceptingBookings?: boolean;
  sortOrder?: number;
}): Promise<TeamMember> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const member = await requireTeamMemberForOrganization(
    supabase,
    organization.id,
    args.teamMemberId,
  );
  const offeringIds = args.offeringIds
    ? await validateOfferingIds(supabase, organization.id, args.offeringIds)
    : member.offering_ids;

  const { data, error } = await supabase
    .from("team_members")
    .update({
      name: args.name ? requiredTrimmed(args.name, "name", 120) : member.name,
      title:
        args.title === undefined
          ? member.title
          : (optionalTrimmed(args.title, "title", 120) ?? "Team member"),
      bio:
        args.bio === undefined
          ? member.bio
          : (optionalTrimmed(args.bio, "bio", 2_000) ?? ""),
      email:
        args.email === undefined
          ? member.email
          : (normalizedEmail(args.email) ?? null),
      phone:
        args.phone === undefined
          ? member.phone
          : (optionalTrimmed(args.phone, "phone", 40) ?? null),
      image_url:
        args.imageUrl === undefined
          ? member.image_url
          : (optionalTrimmed(args.imageUrl, "imageUrl", 2_000) ?? null),
      offering_ids: offeringIds,
      active: args.active ?? member.active,
      accepting_bookings: args.acceptingBookings ?? member.accepting_bookings,
      sort_order: args.sortOrder ?? member.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapTeamMember(data as TeamMemberRow);
}
