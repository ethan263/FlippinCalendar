import "server-only";

import type { AvailabilityRule } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator, ms } from "@/lib/data/auth";
import { requireTeamMemberForOrganization } from "@/lib/data/booking-helpers";
import { boundedInteger } from "@/lib/data/shared";

type AvailabilityRuleRow = {
  id: string;
  organization_id: string;
  team_member_id: string;
  timezone: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function mapRule(row: AvailabilityRuleRow): AvailabilityRule {
  return {
    _id: row.id,
    teamMemberId: row.team_member_id,
    timezone: row.timezone,
    dayOfWeek: row.day_of_week,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    active: row.active,
    createdAt: ms(row.created_at)!,
    updatedAt: ms(row.updated_at)!,
  };
}

export async function listRules(args: {
  teamMemberId?: string;
} = {}): Promise<AvailabilityRule[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  if (args.teamMemberId) {
    await requireTeamMemberForOrganization(
      supabase,
      organization.id,
      args.teamMemberId,
    );
    const { data, error } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("team_member_id", args.teamMemberId)
      .limit(101);
    if (error) throw new Error(error.message);
    return ((data ?? []) as AvailabilityRuleRow[]).map(mapRule);
  }

  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("organization_id", organization.id)
    .limit(1_001);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AvailabilityRuleRow[];
  if (rows.length > 1_000) {
    throw new Error("Availability rule limit exceeded.");
  }
  return rows
    .sort(
      (a, b) =>
        a.day_of_week - b.day_of_week || a.start_minute - b.start_minute,
    )
    .map(mapRule);
}

export async function replaceMemberRules(args: {
  teamMemberId: string;
  rules: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    active?: boolean;
  }>;
}): Promise<AvailabilityRule[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  await requireTeamMemberForOrganization(
    supabase,
    organization.id,
    args.teamMemberId,
  );
  if (args.rules.length > 40) {
    throw new Error(
      "A team member can have at most 40 weekly availability windows.",
    );
  }
  const rules = args.rules.map((rule) => ({
    dayOfWeek: boundedInteger(rule.dayOfWeek, "dayOfWeek", 0, 6),
    startMinute: boundedInteger(rule.startMinute, "startMinute", 0, 1_439),
    endMinute: boundedInteger(rule.endMinute, "endMinute", 1, 1_440),
    active: rule.active ?? true,
  }));
  for (const rule of rules) {
    if (rule.startMinute >= rule.endMinute) {
      throw new Error("Each availability window must end after it starts.");
    }
  }
  for (let day = 0; day < 7; day += 1) {
    const dayRules = rules
      .filter((rule) => rule.active && rule.dayOfWeek === day)
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < dayRules.length; index += 1) {
      if (dayRules[index].startMinute < dayRules[index - 1].endMinute) {
        throw new Error(
          "Availability windows for the same day cannot overlap.",
        );
      }
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("availability_rules")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("team_member_id", args.teamMemberId)
    .limit(101);
  if (existingError) throw new Error(existingError.message);
  if ((existing ?? []).length > 100) {
    throw new Error("Existing availability exceeds the safe replacement limit.");
  }

  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("organization_id", organization.id)
    .eq("team_member_id", args.teamMemberId);
  if (deleteError) throw new Error(deleteError.message);

  if (rules.length > 0) {
    const { error: insertError } = await supabase
      .from("availability_rules")
      .insert(
        rules.map((rule) => ({
          organization_id: organization.id,
          team_member_id: args.teamMemberId,
          timezone: organization.timezone,
          day_of_week: rule.dayOfWeek,
          start_minute: rule.startMinute,
          end_minute: rule.endMinute,
          active: rule.active,
        })),
      );
    if (insertError) throw new Error(insertError.message);
  }

  return listRules({ teamMemberId: args.teamMemberId });
}
