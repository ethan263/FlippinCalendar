"use server";

import {
  getConversationAnalytics,
  getConversationDetail,
  getCurrentAgent,
  listRecentConversations,
  syncRecentConversationsFromElevenLabs,
  updateAgentWorkspaceSettings,
} from "@/lib/data/agents";
import {
  listRules,
  replaceMemberRules,
} from "@/lib/data/availability";
import {
  createForCurrentOrg,
  listForCurrentOrg,
  updateStatus,
} from "@/lib/data/bookings";
import {
  createOffering,
  listOfferings,
  updateOffering,
} from "@/lib/data/catalog";
import { overview } from "@/lib/data/dashboard";
import { listContacts } from "@/lib/data/contacts";
import {
  listKnowledge,
  removeKnowledge,
  upsertKnowledge,
} from "@/lib/data/knowledge";
import {
  getAgentClientToolContext,
  getCurrentDraft,
  publish,
  updateDraft,
} from "@/lib/data/public-site";
import { createMember, listMembers, updateMember } from "@/lib/data/team";
import type {
  AvailabilityRule,
  BookingStatus,
  SiteConfig,
} from "@/components/dashboard/data";

export async function listOfferingsAction(args: { includeInactive?: boolean } = {}) {
  return listOfferings(args);
}

export async function createOfferingAction(args: {
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor: number;
  capacity?: number;
  active?: boolean;
  bookableOnline?: boolean;
}) {
  return createOffering(args);
}

export async function updateOfferingAction(args: {
  offeringId: string;
  name?: string;
  description?: string;
  category?: string;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor?: number;
  capacity?: number;
  active?: boolean;
  bookableOnline?: boolean;
}) {
  return updateOffering(args);
}

export async function listMembersAction(args: { includeInactive?: boolean } = {}) {
  return listMembers(args);
}

export async function createMemberAction(args: {
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
}) {
  return createMember(args);
}

export async function updateMemberAction(args: {
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
}) {
  return updateMember(args);
}

export async function listRulesAction(args: { teamMemberId?: string } = {}) {
  return listRules(args);
}

export async function replaceMemberRulesAction(args: {
  teamMemberId: string;
  rules: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    active?: boolean;
  }>;
}): Promise<AvailabilityRule[]> {
  return replaceMemberRules(args);
}

export async function listBookingsAction(args: {
  from?: number;
  to?: number;
  status?: BookingStatus;
  limit?: number;
} = {}) {
  return listForCurrentOrg(args);
}

export async function createBookingAction(args: {
  offeringId: string;
  teamMemberId?: string;
  startAt: number;
  customer: { name: string; email?: string; phone?: string };
  notes?: string;
  idempotencyKey?: string;
}) {
  return createForCurrentOrg(args);
}

export async function updateBookingStatusAction(args: {
  bookingId: string;
  status: BookingStatus;
}) {
  return updateStatus(args);
}

export async function overviewAction() {
  return overview();
}

export async function getCurrentDraftAction() {
  return getCurrentDraft();
}

export async function getAgentClientToolContextAction() {
  return getAgentClientToolContext();
}

export async function updateDraftAction(args: {
  config: SiteConfig;
  siteSlug?: string;
}) {
  return updateDraft(args);
}

export async function publishSiteAction() {
  return publish();
}

export async function getCurrentAgentAction() {
  return getCurrentAgent();
}

export async function updateAgentWorkspaceSettingsAction(args: {
  webEnabled?: boolean;
  knowledgeBaseId?: string | null;
  showWebChat?: boolean;
  showVoiceChat?: boolean;
}) {
  return updateAgentWorkspaceSettings(args);
}

export async function listRecentConversationsAction(args: {
  limit?: number;
  channel?: "web";
} = {}) {
  return listRecentConversations(args);
}

export async function getConversationAnalyticsAction() {
  return getConversationAnalytics();
}

export async function getConversationDetailAction(conversationId: string) {
  return getConversationDetail(conversationId);
}

export async function syncRecentConversationsAction() {
  return syncRecentConversationsFromElevenLabs();
}

export async function listContactsAction() {
  return listContacts();
}

export async function listKnowledgeAction(args: {
  includeUnpublished?: boolean;
} = {}) {
  return listKnowledge(args);
}

export async function upsertKnowledgeAction(args: {
  knowledgeItemId?: string;
  title: string;
  content: string;
  category?: string;
  published?: boolean;
  sortOrder?: number;
}) {
  return upsertKnowledge(args);
}

export async function removeKnowledgeAction(knowledgeItemId: string) {
  return removeKnowledge(knowledgeItemId);
}
