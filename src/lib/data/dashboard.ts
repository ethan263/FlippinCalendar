import "server-only";

import type { Overview } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator, iso, ms } from "@/lib/data/auth";
import { bookingView, type BookingRow } from "@/lib/data/booking-helpers";
import {
  DAY_MS,
  addLocalDays,
  localDateStringAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "@/lib/data/time";

export async function overview(): Promise<Overview> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const now = Date.now();
  const localToday = parseLocalDate(
    localDateStringAt(now, organization.timezone),
  );
  const localTomorrow = addLocalDays(localToday, 1);
  const todayStart = zonedDateTimeToUtc(
    { ...localToday, hour: 0, minute: 0 },
    organization.timezone,
  );
  const tomorrowStart = zonedDateTimeToUtc(
    { ...localTomorrow, hour: 0, minute: 0 },
    organization.timezone,
  );
  if (todayStart === null || tomorrowStart === null) {
    throw new Error(
      "The organization timezone could not resolve today's calendar bounds.",
    );
  }

  const [
    todayBookingsRes,
    upcomingRes,
    contactsRes,
    conversationsRes,
    offeringsRes,
    teamMembersRes,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("start_at", iso(todayStart))
      .lt("start_at", iso(tomorrowStart))
      .limit(1_001),
    supabase
      .from("bookings")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("start_at", iso(now))
      .lt("start_at", iso(now + 7 * DAY_MS))
      .limit(101),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .limit(5_001),
    supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("started_at", iso(now - 30 * DAY_MS))
      .order("started_at", { ascending: false })
      .limit(101),
    supabase
      .from("offerings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("active", true)
      .limit(501),
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("active", true)
      .limit(501),
  ]);

  for (const result of [
    todayBookingsRes,
    upcomingRes,
    contactsRes,
    conversationsRes,
    offeringsRes,
    teamMembersRes,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const todayBookings = (todayBookingsRes.data ?? []) as BookingRow[];
  const upcoming = (upcomingRes.data ?? []) as BookingRow[];
  const conversations = conversationsRes.data ?? [];

  return {
    organization: {
      _id: organization.id,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
      terminology: organization.terminology,
    },
    stats: {
      bookingsToday: todayBookings
        .slice(0, 1_000)
        .filter((booking) => booking.status !== "canceled").length,
      bookingsTodayIsCapped: todayBookings.length > 1_000,
      completedToday: todayBookings
        .slice(0, 1_000)
        .filter((booking) => booking.status === "completed").length,
      upcomingSevenDays: upcoming
        .slice(0, 100)
        .filter(
          (booking) =>
            booking.status === "confirmed" || booking.status === "pending",
        ).length,
      upcomingSevenDaysIsCapped: upcoming.length > 100,
      totalContacts: Math.min(contactsRes.count ?? 0, 5_000),
      totalContactsIsCapped: (contactsRes.count ?? 0) > 5_000,
      conversationsThirtyDays: Math.min(conversations.length, 100),
      conversationsThirtyDaysIsCapped: conversations.length > 100,
      activeOfferings: Math.min(offeringsRes.count ?? 0, 500),
      activeOfferingsIsCapped: (offeringsRes.count ?? 0) > 500,
      activeTeamMembers: Math.min(teamMembersRes.count ?? 0, 500),
      activeTeamMembersIsCapped: (teamMembersRes.count ?? 0) > 500,
    },
    upcomingBookings: upcoming
      .filter(
        (booking) =>
          booking.status === "confirmed" || booking.status === "pending",
      )
      .slice(0, 20)
      .map((booking) => ({
        ...bookingView(booking),
        source: booking.source,
        notes: booking.notes ?? undefined,
      })),
    recentConversations: conversations.slice(0, 10).map((conversation) => ({
      _id: conversation.id,
      externalConversationId: conversation.external_conversation_id,
      channel: conversation.channel,
      status: conversation.status,
      caller: conversation.caller ?? undefined,
      summary: conversation.summary ?? undefined,
      durationSeconds: conversation.duration_seconds ?? undefined,
      outcome: conversation.outcome ?? undefined,
      startedAt: ms(conversation.started_at)!,
      endedAt: ms(conversation.ended_at),
    })),
  };
}
