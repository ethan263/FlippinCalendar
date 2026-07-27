import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export type TrimrFeature =
  | "operations_hub"
  | "custom_public_page"
  | "web_agent"
  | "browser_voice"
  | "advanced_analytics";

/**
 * Resolve an organization's capability directly from Clerk Billing.
 *
 * Public client pages have no signed-in Clerk session, so `auth().has()` cannot
 * evaluate their organization. The Backend SDK is the authoritative equivalent
 * when the Clerk organization id comes from our tenant-scoped database.
 */
export async function organizationHasFeature(
  organizationId: string,
  feature: TrimrFeature,
): Promise<boolean> {
  const client = await clerkClient();

  try {
    const subscription =
      await client.billing.getOrganizationBillingSubscription(organizationId);

    return subscription.subscriptionItems.some(
      (item) =>
        item.status === "active" &&
        item.plan?.features.some((candidate) => candidate.slug === feature),
    );
  } catch (error) {
    console.error("Unable to read Clerk organization billing subscription", {
      organizationId,
      feature,
      error,
    });
    return false;
  }
}
