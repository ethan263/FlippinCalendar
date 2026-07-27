export type BackendTerminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

export const DEFAULT_TERMINOLOGY: BackendTerminology = {
  offeringSingular: "Service",
  offeringPlural: "Services",
  teamMemberSingular: "Team member",
  teamMemberPlural: "Team",
  customerSingular: "Client",
  customerPlural: "Clients",
  bookingSingular: "Booking",
  bookingPlural: "Bookings",
};

export type SiteConfig = {
  businessName: string;
  headline: string;
  subheadline: string;
  about: string;
  announcement?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  template: "editorial" | "gallery" | "compact" | "business-card";
  theme: {
    accentColor: string;
    backgroundColor: string;
    foregroundColor: string;
    mutedColor: string;
    radius: "sharp" | "soft" | "rounded";
    font: "modern" | "editorial" | "friendly";
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
  };
  socialLinks: Array<{ label: string; url: string }>;
  sections: Array<
    "offerings" | "team" | "about" | "faq" | "contact" | "booking"
  >;
  booking: {
    enabled: boolean;
    slotIntervalMinutes: number;
    minimumNoticeMinutes: number;
    maximumAdvanceDays: number;
  };
  agent: {
    showWebChat: boolean;
    showVoiceChat: boolean;
    showElevenLabsWidget: boolean;
    welcomeMessage: string;
  };
};

export function defaultSiteConfig(businessName: string): SiteConfig {
  return {
    businessName,
    headline: `A simpler way to book with ${businessName}.`,
    subheadline:
      "Choose what you need, find a time that works, and confirm in moments.",
    about:
      "Thoughtful service, straightforward scheduling, and a team ready to help.",
    template: "editorial",
    theme: {
      accentColor: "#2446D8",
      backgroundColor: "#F5F1E8",
      foregroundColor: "#171717",
      mutedColor: "#6B675F",
      radius: "soft",
      font: "editorial",
    },
    contact: {},
    socialLinks: [],
    sections: ["offerings", "team", "about", "faq", "contact", "booking"],
    booking: {
      enabled: true,
      slotIntervalMinutes: 30,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 90,
    },
    agent: {
      showWebChat: false,
      showVoiceChat: false,
      showElevenLabsWidget: false,
      welcomeMessage: `Hi, I'm the ${businessName} concierge. How can I help?`,
    },
  };
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "organization";
}

export function requiredTrimmed(value: string, label: string, max = 200): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return result;
}

export function optionalTrimmed(
  value: string | undefined,
  label: string,
  max = 500,
): string | undefined {
  if (value === undefined) return undefined;
  const result = value.trim();
  if (!result) return undefined;
  if (result.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return result;
}

export function boundedInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${label} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

export function normalizedEmail(value: string | undefined): string | undefined {
  const email = optionalTrimmed(value, "email", 320)?.toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

export function normalizedPhone(value: string | undefined): string | undefined {
  const phone = optionalTrimmed(value, "phone", 40);
  if (!phone) return undefined;
  const normalized = phone.replace(/[^\d+]/g, "");
  if (normalized.replace(/\D/g, "").length < 7) {
    throw new Error("Enter a valid phone number.");
  }
  return normalized;
}

export { assertIanaTimezone } from "@/lib/data/time";
