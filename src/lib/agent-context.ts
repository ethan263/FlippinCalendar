type Terminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

type OfferingContext = {
  name: string;
  description: string;
  durationMinutes: number;
  priceMinor: number;
};

type KnowledgeContext = {
  title: string;
  content: string;
};

type HoursRange = {
  startMinute: number;
  endMinute: number;
};

type WeeklyHoursDay = {
  label: string;
  ranges: HoursRange[];
};

/** ElevenLabs dynamic variables must be string values. */
function asVar(value: unknown, maximum = 8_000): string {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
  const cleaned = raw.replace(/\u0000/g, "").trim();
  return cleaned.length <= maximum
    ? cleaned
    : `${cleaned.slice(0, maximum - 1)}…`;
}

function formatClock(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatWeeklyHoursSummary(
  weeklyHours: WeeklyHoursDay[] | undefined,
): string {
  if (!weeklyHours?.length) {
    return "No regular opening hours have been published yet.";
  }

  return weeklyHours
    .map((day) => {
      if (!day.ranges.length) return `${day.label}: closed`;
      const ranges = day.ranges
        .map(
          (range) =>
            `${formatClock(range.startMinute)}–${formatClock(range.endMinute)}`,
        )
        .join(", ");
      return `${day.label}: ${ranges}`;
    })
    .join("; ");
}

function currentLocalDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day) {
    throw new Error("Could not resolve the organization's current local date.");
  }
  return `${year}-${month}-${day}`;
}

export function createAgentDynamicVariables({
  siteSlug,
  businessName,
  description,
  timezone,
  locale,
  currency,
  terminology,
  offerings,
  knowledgeItems,
  weeklyHours,
  organizationId,
  externalUserId,
  textChatEnabled,
  voiceChatEnabled,
  bookingInstruction,
  personaGuidance,
}: {
  siteSlug: string;
  businessName: string;
  description: string;
  timezone: string;
  locale: string;
  currency: string;
  terminology: Terminology;
  offerings: OfferingContext[];
  knowledgeItems: KnowledgeContext[];
  weeklyHours?: WeeklyHoursDay[];
  /** organizations.id UUID — preferred post-call webhook tenant key. */
  organizationId?: string;
  /** Prefer Clerk org id; used as ElevenLabs-facing tenant identity. */
  externalUserId?: string;
  textChatEnabled?: boolean;
  voiceChatEnabled?: boolean;
  bookingInstruction?: string;
  personaGuidance?: string;
}): Record<string, string> {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const localDate = currentLocalDate(timezone);
  const tenantId = externalUserId || organizationId || siteSlug;
  const hoursSummary = formatWeeklyHoursSummary(weeklyHours);
  const servicesSummary =
    offerings.length > 0
      ? offerings.map((offering) => offering.name).join(", ")
      : "No published offerings.";

  return {
    site_slug: asVar(siteSlug, 200),
    organization_id: asVar(organizationId || tenantId, 200),
    external_user_id: asVar(tenantId, 200),
    business_name: asVar(businessName, 500),
    business_description: asVar(description, 2_500),
    business_timezone: asVar(timezone, 100),
    business_locale: asVar(locale, 50),
    business_terminology: asVar(
      [
        `${terminology.offeringSingular}/${terminology.offeringPlural}`,
        `${terminology.teamMemberSingular}/${terminology.teamMemberPlural}`,
        `${terminology.customerSingular}/${terminology.customerPlural}`,
        `${terminology.bookingSingular}/${terminology.bookingPlural}`,
      ].join(", "),
      500,
    ),
    services_summary: asVar(servicesSummary, 1_500),
    business_offerings: asVar(
      offerings
        .map(
          (offering) =>
            `${offering.name}: ${offering.description} (${offering.durationMinutes} minutes, ${formatter.format(offering.priceMinor / 100)})`,
        )
        .join("\n") || "No offerings have been published yet.",
    ),
    business_hours: asVar(hoursSummary, 2_000),
    business_knowledge: asVar(
      knowledgeItems
        .map((item) => `${item.title}: ${item.content}`)
        .join("\n") || "No additional information is available.",
    ),
    booking_instruction: asVar(
      bookingInstruction ??
        `Today is ${localDate} in ${timezone}. Resolve an unqualified weekday such as Monday to its next future occurrence after this date. Use the booking tools to check live availability, create ${terminology.bookingPlural.toLowerCase()}, and securely look up, reschedule, or cancel existing ${terminology.bookingPlural.toLowerCase()}. Once the offering and date are known, call get_availability immediately before asking which time the customer prefers. Never redirect the customer to the booking panel when a tool can complete the request. If many times are available, offer at most five useful choices and ask whether the customer prefers another part of the day. Output only customer-facing speech: never narrate private reasoning, plans, or tool names.`,
    ),
    interaction_channel: "web",
    text_chat_enabled: textChatEnabled ? "true" : "false",
    voice_chat_enabled: voiceChatEnabled ? "true" : "false",
    persona_guidance: asVar(
      personaGuidance ||
        "Be a warm front-desk concierge. Greet visitors, answer common questions briefly, and help them book when ready.",
      1_500,
    ),
    contact_number_policy: asVar(
      "This is a React web session, including text chat or browser audio. The first reply after detecting a booking, booking lookup, reschedule, cancellation, callback, or other contact-dependent request must ask for a contact phone number before giving directions or collecting other details. Confirm the number, then continue. General information does not require a phone number.",
    ),
  };
}
