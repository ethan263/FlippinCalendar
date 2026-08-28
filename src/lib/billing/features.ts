export type BillingFeature =
  | "operations_hub"
  | "custom_public_page"
  | "web_agent"
  | "browser_voice"
  | "advanced_analytics";

export type BillingPlanKey = "core" | "pro";

const planFeatures: Record<BillingPlanKey, readonly BillingFeature[]> = {
  core: ["operations_hub", "custom_public_page"],
  pro: [
    "operations_hub",
    "custom_public_page",
    "web_agent",
    "browser_voice",
  ],
};

export type PlanEntitlements = {
  plan: BillingPlanKey;
  operationsHub: boolean;
  customPublicPage: boolean;
  webAgent: boolean;
  browserVoice: boolean;
  hasAiAgent: boolean;
};

export function getPlanEntitlements(plan: BillingPlanKey): PlanEntitlements {
  const features = planFeatures[plan];
  const webAgent = features.includes("web_agent");
  const browserVoice = features.includes("browser_voice");
  return {
    plan,
    operationsHub: features.includes("operations_hub"),
    customPublicPage: features.includes("custom_public_page"),
    webAgent,
    browserVoice,
    hasAiAgent: webAgent || browserVoice,
  };
}

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
  }
}
