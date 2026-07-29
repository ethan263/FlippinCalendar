import "server-only";

import type { BillingPlanKey } from "@/lib/billing/features";
import { billingPlanAmountCents, isPaidPlan } from "@/lib/billing/plans";
import { getAppOrigin } from "@/lib/site";

type YocoCheckoutResponse = {
  id: string;
  redirectUrl: string;
  status?: string;
};

export async function createYocoCheckout(args: {
  organizationId: string;
  clerkOrgId: string;
  orgSlug: string;
  plan: BillingPlanKey;
  idempotencyKey: string;
}): Promise<{ checkoutId: string; redirectUrl: string }> {
  if (!isPaidPlan(args.plan)) {
    throw new Error("Core is free — no checkout required.");
  }

  const secretKey = process.env.YOCO_CHECKOUT_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("YOCO_CHECKOUT_SECRET_KEY is not configured.");
  }

  const origin = getAppOrigin();
  const amount = billingPlanAmountCents[args.plan];
  const successUrl = `${origin}/app/${args.orgSlug}/billing?checkout=success&plan=${args.plan}`;
  const cancelUrl = `${origin}/app/${args.orgSlug}/billing?checkout=cancelled`;
  const failureUrl = `${origin}/app/${args.orgSlug}/billing?checkout=failed`;

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      amount,
      currency: "ZAR",
      successUrl,
      cancelUrl,
      failureUrl,
      clientReferenceId: args.organizationId,
      metadata: {
        organizationId: args.organizationId,
        clerkOrgId: args.clerkOrgId,
        orgSlug: args.orgSlug,
        plan: args.plan,
      },
      lineItems: [
        {
          displayName: `flippinCalendar ${args.plan}`,
          quantity: 1,
          pricingDetails: {
            price: amount,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Yoco checkout failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as YocoCheckoutResponse;
  if (!data.id || !data.redirectUrl) {
    throw new Error("Yoco checkout response missing id or redirectUrl.");
  }

  return { checkoutId: data.id, redirectUrl: data.redirectUrl };
}
