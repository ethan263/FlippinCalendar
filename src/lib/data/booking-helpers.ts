import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BookingStatus, Organization, RawBooking } from "@/components/dashboard/data";
import type { OrganizationRow } from "@/lib/data/auth";
import { iso, ms } from "@/lib/data/auth";
import {
  DAY_MS,
  MINUTE_MS,
  dayOfWeek,
  localDateStringAt,
  localDateTimeFromMinute,
  localPartsAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "@/lib/data/time";
import {
  normalizedEmail,
  normalizedPhone,
  optionalTrimmed,
  requiredTrimmed,
} from "@/lib/data/shared";

export const MAX_OFFERING_DURATION_MINUTES = 1_440;
export const MAX_BUFFER_MINUTES = 720;
const MAX_RESERVATION_MS = 2 * DAY_MS;
const MAX_OVERLAP_CANDIDATES = 1_000;

export type CustomerInput = {
  name: string;
  email?: string;
  phone?: string;
};

export type OfferingRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_minor: number;
  currency: string;
  capacity: number;
  active: boolean;
  bookable_online: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  organization_id: string;
  clerk_user_id: string | null;
  name: string;
  title: string;
  bio: string;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  offering_ids: string[];
  active: boolean;
  accepting_bookings: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BookingRow = {
  id: string;
  organization_id: string;
  public_site_id: string | null;
  contact_id: string;
  offering_id: string;
  team_member_id: string;
  start_at: string;
  end_at: string;
  reserved_start_at: string;
  reserved_end_at: string;
  status: BookingStatus;
  source: "dashboard" | "public_site" | "web_agent";
  notes: string | null;
  confirmation_code: string;
  idempotency_key: string | null;
  idempotency_fingerprint: string | null;
  offering_snapshot: RawBooking["offering"];
  team_member_snapshot: RawBooking["teamMember"];
  customer_snapshot: RawBooking["customer"];
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactRow = {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  email_normalized: string | null;
  phone: string | null;
  phone_normalized: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type ContactIdentityPolicy = "update_existing" | "preserve_existing";

export function mapOffering(row: OfferingRow) {
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    durationMinutes: row.duration_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    priceMinor: row.price_minor,
    currency: row.currency,
    capacity: row.capacity,
    active: row.active,
    bookableOnline: row.bookable_online,
    createdAt: ms(row.created_at)!,
    updatedAt: ms(row.updated_at)!,
  };
}

export function mapTeamMember(row: TeamMemberRow) {
  return {
    _id: row.id,
    name: row.name,
    title: row.title,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    bio: row.bio,
    imageUrl: row.image_url ?? undefined,
    offeringIds: row.offering_ids ?? [],
    active: row.active,
    acceptingBookings: row.accepting_bookings,
    sortOrder: row.sort_order,
    createdAt: ms(row.created_at)!,
    updatedAt: ms(row.updated_at)!,
  };
}

export function orgFromRow(row: OrganizationRow): Organization {
  return {
    _id: row.id,
    clerkOrgId: row.clerk_org_id ?? undefined,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    currency: row.currency,
    locale: row.locale,
    terminology: row.terminology,
    createdAt: ms(row.created_at),
    updatedAt: ms(row.updated_at),
  };
}

export async function requireOfferingForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  offeringId: string,
): Promise<OfferingRow> {
  const { data, error } = await supabase
    .from("offerings")
    .select("*")
    .eq("id", offeringId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Offering not found in this organization.");
  return data as OfferingRow;
}

export async function requireTeamMemberForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  teamMemberId: string,
): Promise<TeamMemberRow> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", teamMemberId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Team member not found in this organization.");
  return data as TeamMemberRow;
}

export function memberCanProvideOffering(
  member: TeamMemberRow,
  offeringId: string,
): boolean {
  return (member.offering_ids ?? []).includes(offeringId);
}

export async function eligibleTeamMembers(
  supabase: SupabaseClient,
  organizationId: string,
  offeringId: string,
  requestedTeamMemberId?: string,
): Promise<TeamMemberRow[]> {
  if (requestedTeamMemberId) {
    const member = await requireTeamMemberForOrganization(
      supabase,
      organizationId,
      requestedTeamMemberId,
    );
    if (
      !member.active ||
      !member.accepting_bookings ||
      !memberCanProvideOffering(member, offeringId)
    ) {
      throw new Error("That team member is not available for this offering.");
    }
    return [member];
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .limit(201);
  if (error) throw new Error(error.message);
  const members = (data ?? []) as TeamMemberRow[];
  if (members.length > 200) {
    throw new Error("Too many team members to resolve availability safely.");
  }
  return members
    .filter(
      (member) =>
        member.accepting_bookings &&
        memberCanProvideOffering(member, offeringId),
    )
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
}

export async function hasAvailabilityRuleForReservation(
  supabase: SupabaseClient,
  organization: OrganizationRow,
  member: TeamMemberRow,
  reservedStartAt: number,
  reservedEndAt: number,
): Promise<boolean> {
  const dateString = localDateStringAt(reservedStartAt, organization.timezone);
  const date = parseLocalDate(dateString);
  const weekday = dayOfWeek(date);
  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("team_member_id", member.id)
    .eq("day_of_week", weekday)
    .limit(25);
  if (error) throw new Error(error.message);

  for (const rule of data ?? []) {
    if (!rule.active) continue;
    const ruleStart = zonedDateTimeToUtc(
      localDateTimeFromMinute(date, rule.start_minute),
      rule.timezone,
    );
    const ruleEnd = zonedDateTimeToUtc(
      localDateTimeFromMinute(date, rule.end_minute),
      rule.timezone,
    );
    if (
      ruleStart !== null &&
      ruleEnd !== null &&
      reservedStartAt >= ruleStart &&
      reservedEndAt <= ruleEnd
    ) {
      return true;
    }
  }
  return false;
}

export async function hasBookingOverlap(
  supabase: SupabaseClient,
  organizationId: string,
  teamMemberId: string,
  reservedStartAt: number,
  reservedEndAt: number,
  excludeBookingId?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("team_member_id", teamMemberId)
    .gte("reserved_start_at", iso(reservedStartAt - MAX_RESERVATION_MS))
    .lt("reserved_start_at", iso(reservedEndAt))
    .limit(MAX_OVERLAP_CANDIDATES + 1);
  if (error) throw new Error(error.message);
  const candidates = (data ?? []) as BookingRow[];
  if (candidates.length > MAX_OVERLAP_CANDIDATES) {
    throw new Error("Availability is too dense to verify safely for this window.");
  }
  return candidates.some((booking) => {
    const start = ms(booking.reserved_start_at)!;
    const end = ms(booking.reserved_end_at)!;
    return (
      booking.id !== excludeBookingId &&
      booking.status !== "canceled" &&
      start < reservedEndAt &&
      end > reservedStartAt
    );
  });
}

export async function chooseAvailableTeamMember(
  supabase: SupabaseClient,
  organization: OrganizationRow,
  offering: OfferingRow,
  startAt: number,
  requestedTeamMemberId?: string,
  excludeBookingId?: string,
) {
  if (!Number.isFinite(startAt) || !Number.isInteger(startAt)) {
    throw new Error("startAt must be a UTC epoch timestamp in milliseconds.");
  }
  const endAt = startAt + offering.duration_minutes * MINUTE_MS;
  const reservedStartAt = startAt - offering.buffer_before_minutes * MINUTE_MS;
  const reservedEndAt = endAt + offering.buffer_after_minutes * MINUTE_MS;
  const members = await eligibleTeamMembers(
    supabase,
    organization.id,
    offering.id,
    requestedTeamMemberId,
  );

  for (const member of members) {
    const withinAvailability = await hasAvailabilityRuleForReservation(
      supabase,
      organization,
      member,
      reservedStartAt,
      reservedEndAt,
    );
    if (!withinAvailability) continue;
    if (
      !(await hasBookingOverlap(
        supabase,
        organization.id,
        member.id,
        reservedStartAt,
        reservedEndAt,
        excludeBookingId,
      ))
    ) {
      return { member, endAt, reservedStartAt, reservedEndAt };
    }
  }
  throw new Error(
    "That time is no longer available. Refresh availability and choose another slot.",
  );
}

export function normalizeCustomer(customer: CustomerInput) {
  const name = requiredTrimmed(customer.name, "customer.name", 120);
  const email = normalizedEmail(customer.email);
  const phone = optionalTrimmed(customer.phone, "customer.phone", 40);
  const phoneNormalized = normalizedPhone(phone);
  if (!email && !phoneNormalized) {
    throw new Error(
      "Provide at least one customer email address or phone number.",
    );
  }
  return {
    name,
    email,
    emailNormalized: email,
    phone,
    phoneNormalized,
  };
}

export async function findOrCreateContact(
  supabase: SupabaseClient,
  organizationId: string,
  customerInput: CustomerInput,
  identityPolicy: ContactIdentityPolicy = "update_existing",
): Promise<ContactRow> {
  const customer = normalizeCustomer(customerInput);
  let existing: ContactRow | null = null;

  if (customer.emailNormalized) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("email_normalized", customer.emailNormalized)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    existing = (data as ContactRow | null) ?? null;
  }
  if (!existing && customer.phoneNormalized) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("phone_normalized", customer.phoneNormalized)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    existing = (data as ContactRow | null) ?? null;
  }

  const now = new Date().toISOString();
  if (existing) {
    if (identityPolicy === "preserve_existing") return existing;
    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: customer.name,
        email: customer.email ?? existing.email,
        email_normalized: customer.emailNormalized ?? existing.email_normalized,
        phone: customer.phone ?? existing.phone,
        phone_normalized:
          customer.phoneNormalized ?? existing.phone_normalized,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as ContactRow;
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: organizationId,
      name: customer.name,
      email: customer.email ?? null,
      email_normalized: customer.emailNormalized ?? null,
      phone: customer.phone ?? null,
      phone_normalized: customer.phoneNormalized ?? null,
      tags: [],
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContactRow;
}

function hashString(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
}

export function confirmationCode(startAt: number, fingerprint: string): string {
  return `BK-${new Date(startAt).toISOString().slice(2, 10).replaceAll("-", "")}-${hashString(fingerprint).slice(-5)}`;
}

export function bookingView(booking: BookingRow): RawBooking {
  return {
    bookingId: booking.id,
    status: booking.status,
    startAt: ms(booking.start_at)!,
    endAt: ms(booking.end_at)!,
    startTimeISO: new Date(booking.start_at).toISOString(),
    endTimeISO: new Date(booking.end_at).toISOString(),
    confirmationCode: booking.confirmation_code,
    offering: booking.offering_snapshot,
    teamMember: booking.team_member_snapshot,
    customer: booking.customer_snapshot,
  };
}

export function dateIsWithinBookingWindow(
  startAt: number,
  timeZone: string,
  minimumNoticeMinutes: number,
  maximumAdvanceDays: number,
  now = Date.now(),
): boolean {
  const earliest = now + minimumNoticeMinutes * MINUTE_MS;
  const latest = now + maximumAdvanceDays * DAY_MS;
  localPartsAt(startAt, timeZone);
  return startAt >= earliest && startAt <= latest;
}
