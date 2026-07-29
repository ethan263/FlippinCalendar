import "server-only";

export type FlippinCalendarFeature =
  | "operations_hub"
  | "custom_public_page"
  | "web_agent"
  | "browser_voice"
  | "advanced_analytics";

export { organizationHasFeature } from "@/lib/billing/subscriptions";
