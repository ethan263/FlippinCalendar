import type { BackendTerminology, SiteConfig } from "@/components/dashboard/data";

export type PublishedSite = {
  site: {
    _id: string;
    siteSlug: string;
    config: SiteConfig;
    publishedAt: number;
  };
  organization: {
    id: string;
    clerkOrgId: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    locale: string;
    terminology: BackendTerminology;
  };
  offerings: Array<{
    _id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
    active: boolean;
  }>;
  teamMembers: Array<{
    _id: string;
    name: string;
    title: string;
    bio: string;
    imageUrl?: string;
    offeringIds: string[];
    active: boolean;
  }>;
  knowledgeItems: Array<{
    _id: string;
    title: string;
    content: string;
    category: string;
  }>;
  weeklyHours: Array<{
    dayOfWeek: number;
    label: string;
    ranges: Array<{ startMinute: number; endMinute: number }>;
  }>;
};

export type PublicOffering = PublishedSite["offerings"][number];
export type PublicTeamMember = PublishedSite["teamMembers"][number];
export type PublicTerminology = PublishedSite["organization"]["terminology"];

export type Availability = {
  date: string;
  timezone: string;
  offering: { _id: string; name: string; durationMinutes: number };
  slots: Array<{
    startAt: number;
    endAt: number;
    startTimeISO: string;
    endTimeISO: string;
    teamMemberId: string;
    teamMemberName: string;
  }>;
};

export type AvailabilitySlot = Availability["slots"][number];

export type BookingConfirmation = {
  bookingId: string;
  status: string;
  startAt: number;
  endAt: number;
  startTimeISO: string;
  endTimeISO: string;
  confirmationCode: string;
  offering: {
    name: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
  };
  teamMember: { name: string; title: string };
  customer: { name: string; email?: string; phone?: string };
  replayed: boolean;
};
