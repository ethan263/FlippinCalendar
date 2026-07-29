export type BillingFeature =
  | "operations_hub"
  | "custom_public_page"
  | "web_agent"
  | "browser_voice"
  | "advanced_analytics";

export type BillingPlanKey = "core" | "pro" | "voice";

const planFeatures: Record<BillingPlanKey, readonly BillingFeature[]> = {
  core: ["operations_hub", "custom_public_page", "web_agent"],
  pro: ["operations_hub", "custom_public_page", "web_agent"],
  voice: [
    "operations_hub",
    "custom_public_page",
    "web_agent",
    "browser_voice",
    "advanced_analytics",
  ],
};

export function planIncludesFeature(
  plan: BillingPlanKey,
  feature: BillingFeature,
): boolean {
  return planFeatures[plan].includes(feature);
}

export function planDisplayName(plan: BillingPlanKey): string {
  switch (plan) {
    case "core":
      return "Core";
    case "pro":
      return "Pro";
    case "voice":
      return "Voice";
  }
}
