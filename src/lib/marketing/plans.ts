export type MarketingPlanKey = "core" | "pro";

export type MarketingPlan = {
  key: MarketingPlanKey;
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
    name: "Core",
    price: "R0",
    description: "Bookings, operations, and a custom public page.",
    features: [
      "Bookings and availability",
      "Offerings and team",
      "Custom public page",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "R99",
    description: "AI concierge on your public page.",
    features: [
      "Everything in Core",
      "AI text chat concierge",
      "ElevenLabs web agent",
    ],
    featured: true,
  },
];

export const pricingPeriodLabel = "/mo";

export function isFreePlan(planKey: MarketingPlanKey): boolean {
  return planKey === "core";
}
