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
    description: "Bookings, ops, and your public page.",
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
    description: "AI chat, voice, and analytics.",
    features: [
      "Everything in Core",
      "AI text chat concierge",
      "Browser audio concierge",
      "Advanced conversation analytics",
    ],
    featured: true,
  },
];

export const pricingPeriodLabel = "/mo";

export function isFreePlan(planKey: MarketingPlanKey): boolean {
  return planKey === "core";
}
