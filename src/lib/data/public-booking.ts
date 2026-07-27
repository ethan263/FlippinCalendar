import "server-only";

import type { SiteConfig } from "@/components/dashboard/data";
import type { OrganizationRow } from "@/lib/data/auth";
import { iso, ms } from "@/lib/data/auth";
import {
  bookingView,
  chooseAvailableTeamMember,
  confirmationCode,
  dateIsWithinBookingWindow,
  eligibleTeamMembers,
  findOrCreateContact,
  normalizeCustomer,
  requireOfferingForOrganization,
  type BookingRow,
} from "@/lib/data/booking-helpers";
import {
  DAY_MS,
  MINUTE_MS,
  addLocalDays,
  dayOfWeek,
  localDateTimeFromMinute,
  localPartsAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "@/lib/data/time";
import {
  normalizedPhone,
  optionalTrimmed,
  requiredTrimmed,
} from "@/lib/data/shared";
import { createAdminClient } from "@/lib/supabase/admin";

const TEN_MINUTES_MS = 10 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;
const SITE_BURST_LIMIT = 40;
const SITE_DAILY_LIMIT = 1_000;
const CONTACT_HOURLY_LIMIT = 3;
const CONTACT_DAILY_LIMIT = 8;
const MANAGEMENT_SITE_BURST_LIMIT = 120;
const MANAGEMENT_CONTACT_HOURLY_LIMIT = 20;
const RATE_LIMIT_CLEANUP_BATCH = 32;

type PublicSiteRow = {
  id: string;
  organization_id: string;
  site_slug: string;
  draft: SiteConfig;
  published: SiteConfig | null;
  published_at: string | null;
};

function hashContactIdentifier(value: string): string {
  let first = 2_166_136_261;
  let second = 2_654_435_761;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16_777_619);
    second ^= code + index;
    second = Math.imul(second, 2_246_822_519);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

async function incrementPublicBookingWindow(
  organizationId: string,
  publicSiteId: string,
  scopeKey: string,
  windowMs: number,
  limit: number,
  now: number,
) {
  const supabase = createAdminClient();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const { data: row, error } = await supabase
    .from("public_booking_rate_limits")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("public_site_id", publicSiteId)
    .eq("scope_key", scopeKey)
    .eq("window_start", windowStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (row && row.count >= limit) {
    throw new Error("Too many booking requests. Please wait and try again later.");
  }
  if (row) {
    const { error: updateError } = await supabase
      .from("public_booking_rate_limits")
      .update({ count: row.count + 1 })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from("public_booking_rate_limits")
      .insert({
        organization_id: organizationId,
        public_site_id: publicSiteId,
        scope_key: scopeKey,
        window_start: windowStart,
        count: 1,
        expires_at: iso(windowStart + 2 * windowMs),
      });
    if (insertError) throw new Error(insertError.message);
  }
}

async function applyPublicBookingRateLimits(
  organizationId: string,
  publicSiteId: string,
  customer: ReturnType<typeof normalizeCustomer>,
  now: number,
) {
  const supabase = createAdminClient();
  const { data: expired } = await supabase
    .from("public_booking_rate_limits")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("public_site_id", publicSiteId)
    .lt("expires_at", iso(now))
    .limit(RATE_LIMIT_CLEANUP_BATCH);
  for (const row of expired ?? []) {
    await supabase.from("public_booking_rate_limits").delete().eq("id", row.id);
  }

  await incrementPublicBookingWindow(
    organizationId,
    publicSiteId,
    "site:10m",
    TEN_MINUTES_MS,
    SITE_BURST_LIMIT,
    now,
  );
  await incrementPublicBookingWindow(
    organizationId,
    publicSiteId,
    "site:day",
    DAY_MS,
    SITE_DAILY_LIMIT,
    now,
  );

  const contactScopes = [
    customer.emailNormalized
      ? `email:${hashContactIdentifier(`${organizationId}:email:${customer.emailNormalized}`)}`
      : undefined,
    customer.phoneNormalized
      ? `phone:${hashContactIdentifier(`${organizationId}:phone:${customer.phoneNormalized}`)}`
      : undefined,
  ].filter((scope): scope is string => scope !== undefined);

  for (const contactScope of contactScopes) {
    await incrementPublicBookingWindow(
      organizationId,
      publicSiteId,
      `contact:hour:${contactScope}`,
      HOUR_MS,
      CONTACT_HOURLY_LIMIT,
      now,
    );
    await incrementPublicBookingWindow(
      organizationId,
      publicSiteId,
      `contact:day:${contactScope}`,
      DAY_MS,
      CONTACT_DAILY_LIMIT,
      now,
    );
  }
}

async function applyPublicManagementRateLimits(
  organizationId: string,
  publicSiteId: string,
  phoneNormalized: string,
  now: number,
) {
  const supabase = createAdminClient();
  const { data: expired } = await supabase
    .from("public_booking_rate_limits")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("public_site_id", publicSiteId)
    .lt("expires_at", iso(now))
    .limit(RATE_LIMIT_CLEANUP_BATCH);
  for (const row of expired ?? []) {
    await supabase.from("public_booking_rate_limits").delete().eq("id", row.id);
  }
  await incrementPublicBookingWindow(
    organizationId,
    publicSiteId,
    "manage:site:10m",
    TEN_MINUTES_MS,
    MANAGEMENT_SITE_BURST_LIMIT,
    now,
  );
  await incrementPublicBookingWindow(
    organizationId,
    publicSiteId,
    `manage:contact:hour:${hashContactIdentifier(`${organizationId}:phone:${phoneNormalized}`)}`,
    HOUR_MS,
    MANAGEMENT_CONTACT_HOURLY_LIMIT,
    now,
  );
}

function publicManagementView(booking: BookingRow) {
  const view = bookingView(booking);
  return {
    status: view.status,
    startAt: view.startAt,
    endAt: view.endAt,
    startTimeISO: view.startTimeISO,
    endTimeISO: view.endTimeISO,
    confirmationCode: view.confirmationCode,
    offering: view.offering,
    teamMember: view.teamMember,
    customerName: booking.customer_snapshot.name,
  };
}

async function requirePublicBookingAccess(
  organizationId: string,
  confirmationCodeRaw: string,
  phoneRaw: string,
) {
  const supabase = createAdminClient();
  const confirmationCodeValue = requiredTrimmed(
    confirmationCodeRaw,
    "confirmationCode",
    40,
  ).toUpperCase();
  const phone = normalizedPhone(phoneRaw);
  if (!phone) {
    throw new Error("Provide the contact phone number for this booking.");
  }
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("confirmation_code", confirmationCodeValue)
    .limit(11);
  if (error) throw new Error(error.message);
  const candidates = (data ?? []) as BookingRow[];
  if (candidates.length > 10) return null;
  return (
    candidates.find(
      (candidate) =>
        normalizedPhone(candidate.customer_snapshot.phone) === phone,
    ) ?? null
  );
}

async function publicContext(
  siteSlugRaw: string,
  requireBookingEnabled = true,
) {
  const supabase = createAdminClient();
  const siteSlug = siteSlugRaw.trim().toLowerCase();
  const { data: site, error } = await supabase
    .from("public_sites")
    .select("*")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const siteRow = site as PublicSiteRow | null;
  if (!siteRow?.published || !siteRow.published_at) {
    throw new Error("Published site not found.");
  }
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", siteRow.organization_id)
    .maybeSingle();
  if (orgError) throw new Error(orgError.message);
  if (!organization) throw new Error("Published organization not found.");
  if (requireBookingEnabled && !siteRow.published.booking.enabled) {
    throw new Error("Online booking is not enabled for this site.");
  }
  return {
    supabase,
    site: siteRow,
    organization: organization as OrganizationRow,
    config: siteRow.published,
  };
}

export async function getAvailability(args: {
  siteSlug: string;
  offeringId: string;
  date: string;
  teamMemberId?: string;
}) {
  const { supabase, organization, config } = await publicContext(args.siteSlug);
  const offering = await requireOfferingForOrganization(
    supabase,
    organization.id,
    args.offeringId,
  );
  if (!offering.active || !offering.bookable_online) {
    throw new Error("This offering is not available for online booking.");
  }
  const date = parseLocalDate(args.date);
  const weekday = dayOfWeek(date);
  const nextDate = addLocalDays(date, 1);
  const dayStart = zonedDateTimeToUtc(
    { ...date, hour: 0, minute: 0 },
    organization.timezone,
  );
  const dayEnd = zonedDateTimeToUtc(
    { ...nextDate, hour: 0, minute: 0 },
    organization.timezone,
  );
  if (dayStart === null || dayEnd === null) {
    throw new Error(
      "Could not resolve that date in the organization's timezone.",
    );
  }

  const members = await eligibleTeamMembers(
    supabase,
    organization.id,
    offering.id,
    args.teamMemberId,
  );
  if (members.length > 50) {
    throw new Error("Select a team member to narrow this availability search.");
  }

  const now = Date.now();
  const slots: Array<{
    startAt: number;
    endAt: number;
    startTimeISO: string;
    endTimeISO: string;
    teamMemberId: string;
    teamMemberName: string;
  }> = [];

  for (const member of members) {
    const [rulesRes, bookingsRes] = await Promise.all([
      supabase
        .from("availability_rules")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("team_member_id", member.id)
        .eq("day_of_week", weekday)
        .limit(25),
      supabase
        .from("bookings")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("team_member_id", member.id)
        .gte("reserved_start_at", iso(dayStart - 2 * DAY_MS))
        .lt("reserved_start_at", iso(dayEnd + DAY_MS))
        .limit(1_001),
    ]);
    if (rulesRes.error) throw new Error(rulesRes.error.message);
    if (bookingsRes.error) throw new Error(bookingsRes.error.message);
    const rules = rulesRes.data ?? [];
    const bookings = (bookingsRes.data ?? []) as BookingRow[];
    if (bookings.length > 1_000) {
      throw new Error(
        "Availability is too dense to calculate safely for this date.",
      );
    }

    for (const rule of rules) {
      if (!rule.active) continue;
      const firstPossibleMinute =
        rule.start_minute + offering.buffer_before_minutes;
      const firstStartMinute =
        Math.ceil(firstPossibleMinute / config.booking.slotIntervalMinutes) *
        config.booking.slotIntervalMinutes;
      const finalStartMinute =
        rule.end_minute -
        offering.duration_minutes -
        offering.buffer_after_minutes;

      for (
        let startMinute = firstStartMinute;
        startMinute <= finalStartMinute;
        startMinute += config.booking.slotIntervalMinutes
      ) {
        if (slots.length >= 500) break;
        const startAt = zonedDateTimeToUtc(
          localDateTimeFromMinute(date, startMinute),
          rule.timezone,
        );
        if (startAt === null) continue;
        if (
          !dateIsWithinBookingWindow(
            startAt,
            organization.timezone,
            config.booking.minimumNoticeMinutes,
            config.booking.maximumAdvanceDays,
            now,
          )
        ) {
          continue;
        }
        const endAt = startAt + offering.duration_minutes * MINUTE_MS;
        const reservedStartAt =
          startAt - offering.buffer_before_minutes * MINUTE_MS;
        const reservedEndAt =
          endAt + offering.buffer_after_minutes * MINUTE_MS;
        const overlaps = bookings.some((booking) => {
          const reservedStart = ms(booking.reserved_start_at)!;
          const reservedEnd = ms(booking.reserved_end_at)!;
          return (
            booking.status !== "canceled" &&
            reservedStart < reservedEndAt &&
            reservedEnd > reservedStartAt
          );
        });
        if (!overlaps) {
          slots.push({
            startAt,
            endAt,
            startTimeISO: new Date(startAt).toISOString(),
            endTimeISO: new Date(endAt).toISOString(),
            teamMemberId: member.id,
            teamMemberName: member.name,
          });
        }
      }
    }
  }

  slots.sort(
    (a, b) =>
      a.startAt - b.startAt || a.teamMemberName.localeCompare(b.teamMemberName),
  );

  return {
    date: args.date,
    timezone: organization.timezone,
    offering: {
      _id: offering.id,
      name: offering.name,
      durationMinutes: offering.duration_minutes,
    },
    slots,
  };
}

export async function createPublicBooking(args: {
  siteSlug: string;
  offeringId: string;
  teamMemberId?: string;
  startAt: number;
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
  idempotencyKey: string;
  source?: "public_site" | "web_agent";
}) {
  const { supabase, site, organization, config } = await publicContext(
    args.siteSlug,
  );
  const offering = await requireOfferingForOrganization(
    supabase,
    organization.id,
    args.offeringId,
  );
  if (!offering.active || !offering.bookable_online) {
    throw new Error("This offering is not available for online booking.");
  }
  const idempotencyKey = requiredTrimmed(
    args.idempotencyKey,
    "idempotencyKey",
    128,
  );
  if (idempotencyKey.length < 8) {
    throw new Error("idempotencyKey must be at least 8 characters.");
  }
  const customer = normalizeCustomer(args.customer);
  const notes = optionalTrimmed(args.notes, "notes", 2_000);
  const source = args.source ?? "public_site";
  if (source === "web_agent" && !args.teamMemberId) {
    throw new Error(
      "Web agent bookings must include the exact team member from a returned availability slot.",
    );
  }
  const fingerprint = JSON.stringify({
    siteId: site.id,
    offeringId: offering.id,
    requestedTeamMemberId: args.teamMemberId ?? null,
    startAt: args.startAt,
    customer: {
      name: customer.name,
      email: customer.emailNormalized ?? null,
      phone: customer.phoneNormalized ?? null,
    },
    notes: notes ?? null,
  });

  const { data: replay } = await supabase
    .from("bookings")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (replay) {
    const row = replay as BookingRow;
    if (row.idempotency_fingerprint !== fingerprint) {
      throw new Error(
        "That idempotency key was already used for a different booking request.",
      );
    }
    return { ...bookingView(row), replayed: true };
  }

  if (
    !dateIsWithinBookingWindow(
      args.startAt,
      organization.timezone,
      config.booking.minimumNoticeMinutes,
      config.booking.maximumAdvanceDays,
    )
  ) {
    throw new Error("That start time is outside this site's booking window.");
  }
  const localStart = localPartsAt(args.startAt, organization.timezone);
  const minuteOfDay = localStart.hour * 60 + localStart.minute;
  if (
    args.startAt % MINUTE_MS !== 0 ||
    minuteOfDay % config.booking.slotIntervalMinutes !== 0
  ) {
    throw new Error(
      "That start time is not aligned to this site's booking interval.",
    );
  }

  const now = Date.now();
  await applyPublicBookingRateLimits(
    organization.id,
    site.id,
    customer,
    now,
  );
  const selection = await chooseAvailableTeamMember(
    supabase,
    organization,
    offering,
    args.startAt,
    args.teamMemberId,
  );
  const contact = await findOrCreateContact(
    supabase,
    organization.id,
    customer,
    "preserve_existing",
  );
  const code = confirmationCode(args.startAt, fingerprint);
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      organization_id: organization.id,
      public_site_id: site.id,
      contact_id: contact.id,
      offering_id: offering.id,
      team_member_id: selection.member.id,
      start_at: iso(args.startAt),
      end_at: iso(selection.endAt),
      reserved_start_at: iso(selection.reservedStartAt),
      reserved_end_at: iso(selection.reservedEndAt),
      status: "confirmed",
      source,
      notes: notes ?? null,
      confirmation_code: code,
      idempotency_key: idempotencyKey,
      idempotency_fingerprint: fingerprint,
      offering_snapshot: {
        name: offering.name,
        durationMinutes: offering.duration_minutes,
        priceMinor: offering.price_minor,
        currency: offering.currency,
      },
      team_member_snapshot: {
        name: selection.member.name,
        title: selection.member.title,
      },
      customer_snapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...bookingView(data as BookingRow), replayed: false };
}

export async function lookupPublicBooking(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
}) {
  const { site, organization } = await publicContext(args.siteSlug, false);
  const phone = normalizedPhone(args.phone);
  if (!phone) {
    throw new Error("Provide the contact phone number for this booking.");
  }
  await applyPublicManagementRateLimits(
    organization.id,
    site.id,
    phone,
    Date.now(),
  );
  const booking = await requirePublicBookingAccess(
    organization.id,
    args.confirmationCode,
    args.phone,
  );
  if (!booking) {
    return {
      success: false as const,
      error:
        "No booking matched that confirmation code and contact phone number.",
    };
  }
  return { success: true as const, booking: publicManagementView(booking) };
}

export async function cancelPublicBooking(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
}) {
  const { supabase, site, organization } = await publicContext(
    args.siteSlug,
    false,
  );
  const phone = normalizedPhone(args.phone);
  if (!phone) {
    throw new Error("Provide the contact phone number for this booking.");
  }
  await applyPublicManagementRateLimits(
    organization.id,
    site.id,
    phone,
    Date.now(),
  );
  const booking = await requirePublicBookingAccess(
    organization.id,
    args.confirmationCode,
    args.phone,
  );
  if (!booking) {
    return {
      success: false as const,
      error:
        "No booking matched that confirmation code and contact phone number.",
    };
  }
  if (booking.status === "canceled") {
    return { success: true as const, booking: publicManagementView(booking) };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    throw new Error(`A ${booking.status} booking cannot be canceled online.`);
  }
  if (ms(booking.start_at)! <= Date.now()) {
    throw new Error("Past bookings cannot be canceled online.");
  }
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", booking.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    success: true as const,
    booking: publicManagementView(data as BookingRow),
  };
}

export async function reschedulePublicBooking(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
  offeringId: string;
  startAt: number;
  teamMemberId?: string;
}) {
  const { supabase, site, organization, config } = await publicContext(
    args.siteSlug,
  );
  const phone = normalizedPhone(args.phone);
  if (!phone) {
    throw new Error("Provide the contact phone number for this booking.");
  }
  await applyPublicManagementRateLimits(
    organization.id,
    site.id,
    phone,
    Date.now(),
  );
  const booking = await requirePublicBookingAccess(
    organization.id,
    args.confirmationCode,
    args.phone,
  );
  if (!booking) {
    return {
      success: false as const,
      error:
        "No booking matched that confirmation code and contact phone number.",
    };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    throw new Error(
      `A ${booking.status} booking cannot be rescheduled online.`,
    );
  }
  if (booking.offering_id !== args.offeringId) {
    throw new Error(
      "That availability slot belongs to a different offering. Check availability again.",
    );
  }
  const offering = await requireOfferingForOrganization(
    supabase,
    organization.id,
    booking.offering_id,
  );
  if (!offering.active || !offering.bookable_online) {
    throw new Error("This offering can no longer be rescheduled online.");
  }
  if (
    !dateIsWithinBookingWindow(
      args.startAt,
      organization.timezone,
      config.booking.minimumNoticeMinutes,
      config.booking.maximumAdvanceDays,
    )
  ) {
    throw new Error("That start time is outside this site's booking window.");
  }
  const localStart = localPartsAt(args.startAt, organization.timezone);
  const minuteOfDay = localStart.hour * 60 + localStart.minute;
  if (
    args.startAt % MINUTE_MS !== 0 ||
    minuteOfDay % config.booking.slotIntervalMinutes !== 0
  ) {
    throw new Error(
      "That start time is not aligned to this site's booking interval.",
    );
  }

  const selection = await chooseAvailableTeamMember(
    supabase,
    organization,
    offering,
    args.startAt,
    args.teamMemberId ?? booking.team_member_id,
    booking.id,
  );
  const nextConfirmationCode = confirmationCode(
    args.startAt,
    JSON.stringify({
      bookingId: booking.id,
      previousStartAt: booking.start_at,
      startAt: args.startAt,
      teamMemberId: selection.member.id,
    }),
  );
  const { data, error } = await supabase
    .from("bookings")
    .update({
      team_member_id: selection.member.id,
      start_at: iso(args.startAt),
      end_at: iso(selection.endAt),
      reserved_start_at: iso(selection.reservedStartAt),
      reserved_end_at: iso(selection.reservedEndAt),
      confirmation_code: nextConfirmationCode,
      team_member_snapshot: {
        name: selection.member.name,
        title: selection.member.title,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    success: true as const,
    booking: publicManagementView(data as BookingRow),
  };
}
