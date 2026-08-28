import "server-only";

import type { BillingPlanKey } from "@/lib/billing/features";
import { planDisplayName } from "@/lib/billing/features";
import { billingPlanAmountCents, isPaidPlan } from "@/lib/billing/plans";
import { getAppOrigin, getWebhooksOrigin } from "@/lib/site";

import {
  getPayfastCredentials,
  getPayfastMode,
  getPayfastProcessUrl,
} from "./config";
import { generatePayfastSignature } from "./signature";

export type PayfastCheckoutForm = {
  actionUrl: string;
  fields: Record<string, string>;
};

function formatPayfastAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function createPayfastCheckout(args: {
  organizationId: string;
  clerkOrgId: string;
  orgSlug: string;
  plan: BillingPlanKey;
  mPaymentId: string;
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
}): Promise<PayfastCheckoutForm> {
  if (!isPaidPlan(args.plan)) {
    throw new Error("Core is free — no checkout required.");
  }

  const { merchantId, merchantKey, passphrase } = getPayfastCredentials();
  const origin = getAppOrigin();

  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be a public https URL for PayFast redirects.",
    );
  }

  const amount = billingPlanAmountCents[args.plan];
  const returnUrl = `${origin}/app/${args.orgSlug}/billing?checkout=success&plan=${args.plan}`;
  const cancelUrl = `${origin}/app/${args.orgSlug}/billing?checkout=cancelled`;

  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: `${getWebhooksOrigin()}/api/webhooks/payfast`,
    name_first: args.payerFirstName,
    name_last: args.payerLastName,
    email_address: args.payerEmail,
    m_payment_id: args.mPaymentId,
    amount: formatPayfastAmount(amount),
    item_name: `flippinCalendar ${planDisplayName(args.plan)}`,
    custom_str1: args.organizationId,
    custom_str2: args.plan,
    custom_str3: args.clerkOrgId,
  };

  if (getPayfastMode() === "sandbox") {
    fields.email_confirmation = "0";
  }

  fields.signature = generatePayfastSignature(fields, passphrase || undefined);

  return {
    actionUrl: getPayfastProcessUrl(),
    fields,
  };
}
