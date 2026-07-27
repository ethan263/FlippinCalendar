"use server";

import {
  cancelPublicBooking,
  createPublicBooking,
  getAvailability,
  lookupPublicBooking,
  reschedulePublicBooking,
} from "@/lib/data/public-booking";
import {
  getAgentSessionConfig,
  getPublishedBySlug,
} from "@/lib/data/public-site";
import { requestPublicSession } from "@/lib/data/agents";

export async function getPublishedBySlugAction(siteSlug: string) {
  return getPublishedBySlug(siteSlug);
}

export async function getAgentSessionConfigAction(siteSlug: string) {
  return getAgentSessionConfig(siteSlug);
}

export async function getAvailabilityAction(args: {
  siteSlug: string;
  offeringId: string;
  date: string;
  teamMemberId?: string;
}) {
  return getAvailability(args);
}

export async function createPublicBookingAction(args: {
  siteSlug: string;
  offeringId: string;
  teamMemberId?: string;
  startAt: number;
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
  idempotencyKey: string;
  source?: "public_site" | "web_agent";
}) {
  return createPublicBooking(args);
}

export async function lookupPublicBookingAction(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
}) {
  return lookupPublicBooking(args);
}

export async function cancelPublicBookingAction(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
}) {
  return cancelPublicBooking(args);
}

export async function reschedulePublicBookingAction(args: {
  siteSlug: string;
  confirmationCode: string;
  phone: string;
  offeringId: string;
  startAt: number;
  teamMemberId?: string;
}) {
  return reschedulePublicBooking(args);
}

export async function requestPublicSessionAction(args: {
  siteSlug: string;
  clientKey: string;
  mode: "text" | "voice" | "widget";
}) {
  return requestPublicSession(args);
}
