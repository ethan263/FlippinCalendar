import "server-only";

import type { BookingStatus, RawBooking } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator, iso, ms } from "@/lib/data/auth";
import {
  bookingView,
  chooseAvailableTeamMember,
  confirmationCode,
  findOrCreateContact,
  normalizeCustomer,
  requireOfferingForOrganization,
  type BookingRow,
} from "@/lib/data/booking-helpers";
import { DAY_MS, MINUTE_MS } from "@/lib/data/time";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "@/lib/data/shared";

export async function listForCurrentOrg(args: {
  from?: number;
  to?: number;
  status?: BookingStatus;
  limit?: number;
} = {}) {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const now = Date.now();
  const from = args.from ?? now - 30 * DAY_MS;
  const to = args.to ?? now + 180 * DAY_MS;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    throw new Error("from and to must define a valid UTC millisecond range.");
  }
  if (to - from > 2 * 366 * DAY_MS) {
    throw new Error("Booking list windows cannot exceed two years.");
  }
  const limit = boundedInteger(args.limit ?? 100, "limit", 1, 200);

  let query = supabase
    .from("bookings")
    .select("*")
    .eq("organization_id", organization.id)
    .gte("start_at", iso(from))
    .lt("start_at", iso(to))
    .order("start_at", { ascending: true })
    .limit(limit);
  if (args.status) query = query.eq("status", args.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as BookingRow[]).map((booking) => ({
    ...bookingView(booking),
    contactId: booking.contact_id,
    offeringId: booking.offering_id,
    teamMemberId: booking.team_member_id,
    source: booking.source,
    notes: booking.notes ?? undefined,
    createdAt: ms(booking.created_at),
    updatedAt: ms(booking.updated_at),
  }));
}

export async function createForCurrentOrg(args: {
  offeringId: string;
  teamMemberId?: string;
  startAt: number;
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
  idempotencyKey?: string;
}): Promise<RawBooking & { replayed: boolean }> {
  const { auth, organization, supabase } =
    await requireCurrentOrganizationOperator();
  const offering = await requireOfferingForOrganization(
    supabase,
    organization.id,
    args.offeringId,
  );
  if (!offering.active) throw new Error("This offering is inactive.");
  if (
    !Number.isInteger(args.startAt) ||
    args.startAt % MINUTE_MS !== 0 ||
    args.startAt <= Date.now()
  ) {
    throw new Error(
      "startAt must be a future UTC epoch timestamp aligned to a minute.",
    );
  }
  const customer = normalizeCustomer(args.customer);
  const notes = optionalTrimmed(args.notes, "notes", 2_000);
  const idempotencyKey = args.idempotencyKey
    ? requiredTrimmed(args.idempotencyKey, "idempotencyKey", 128)
    : undefined;
  if (idempotencyKey && idempotencyKey.length < 8) {
    throw new Error("idempotencyKey must be at least 8 characters.");
  }
  const fingerprint = JSON.stringify({
    source: "dashboard",
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

  if (idempotencyKey) {
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
  }

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
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      organization_id: organization.id,
      contact_id: contact.id,
      offering_id: offering.id,
      team_member_id: selection.member.id,
      start_at: iso(args.startAt),
      end_at: iso(selection.endAt),
      reserved_start_at: iso(selection.reservedStartAt),
      reserved_end_at: iso(selection.reservedEndAt),
      status: "confirmed",
      source: "dashboard",
      notes: notes ?? null,
      confirmation_code: confirmationCode(args.startAt, fingerprint),
      idempotency_key: idempotencyKey ?? null,
      idempotency_fingerprint: idempotencyKey ? fingerprint : null,
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
      created_by_user_id: auth.userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...bookingView(data as BookingRow), replayed: false };
}

export async function updateStatus(args: {
  bookingId: string;
  status: BookingStatus;
}): Promise<RawBooking> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", args.bookingId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!booking) throw new Error("Booking not found in this organization.");
  const row = booking as BookingRow;

  const allowed: Record<BookingStatus, BookingStatus[]> = {
    pending: ["confirmed", "canceled"],
    confirmed: ["completed", "canceled", "no_show"],
    completed: [],
    canceled: [],
    no_show: [],
  };
  if (row.status !== args.status && !allowed[row.status].includes(args.status)) {
    throw new Error(
      `Cannot move a booking from ${row.status} to ${args.status}.`,
    );
  }
  if (row.status !== args.status) {
    const { data, error: updateError } = await supabase
      .from("bookings")
      .update({ status: args.status, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);
    return bookingView(data as BookingRow);
  }
  return bookingView(row);
}
