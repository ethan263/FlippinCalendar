export type MarketingPlanKey = "core" | "pro" | "voice";

export type ClerkPlanSlug = "free_org" | "engage" | "voice";

export type MarketingPlan = {
  key: MarketingPlanKey;
  clerkPlanSlug: ClerkPlanSlug;
  name: string;
  price: string;
  description?: string;
  copy?: string;
  features: string[];
  featured?: boolean;
};

/** Public marketing prices in South African Rand (ZAR). */
export const marketingPlans: MarketingPlan[] = [
  {
    key: "core",
    clerkPlanSlug: "free_org",
    name: "Core",
    price: "R0",
    copy: "The operational home for a new organization.",
    description: "Bookings, operations, and a custom public page.",
    features: [
      "Bookings and availability",
      "Offerings and team",
      "Custom public page",
    ],
  },
  {
    key: "pro",
    clerkPlanSlug: "engage",
    name: "Pro",
    price: "R249",
    copy: "Give every visitor an AI concierge on the web.",
    description: "Add an ElevenLabs agent to every client page.",
    features: [
      "Everything in Core",
      "ElevenLabs web agent",
      "Conversation history",
    ],
    featured: true,
  },
  {
    key: "voice",
    clerkPlanSlug: "voice",
    name: "Voice",
    price: "R699",
    copy: "Let clients speak with your AI front desk from any browser.",
    description: "Let clients speak with your agent directly in the browser.",
    features: [
      "Everything in Pro",
      "Live browser audio",
      "Advanced analytics",
    ],
  },
];

export const pricingPeriodLabel = "/mo";
