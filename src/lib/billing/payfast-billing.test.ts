import { describe, expect, it } from "vitest";

import { buildCheckoutMPaymentId } from "@/lib/billing/payfast-metadata";
import { readPayfastPaymentMetadata } from "@/lib/billing/payfast-metadata";
import { billingPlanAmountCents } from "@/lib/billing/plans";
import { generatePayfastSignature, generatePayfastItnSignature, verifyPayfastSignature } from "@/lib/payfast/signature";

describe("PayFast billing helpers", () => {
  it("builds stable m_payment_id keys per org/plan/hour", () => {
    const keyA = buildCheckoutMPaymentId("org-1", "pro");
    const keyB = buildCheckoutMPaymentId("org-1", "pro");
    const keyC = buildCheckoutMPaymentId("org-1", "core");

    expect(keyA).toBe(keyB);
    expect(keyC).not.toBe(keyA);
    expect(keyA).toContain("org-1");
  });

  it("reads payment metadata from ITN payload", () => {
    expect(
      readPayfastPaymentMetadata({
        custom_str1: "org-uuid",
        custom_str2: "pro",
      }),
    ).toEqual({
      organizationId: "org-uuid",
      plan: "pro",
    });
  });

  it("generates checkout signatures in PayFast documentation field order", () => {
    const passphrase = "test-pass";
    const fields = {
      merchant_id: "10000100",
      merchant_key: "46f0cd694581a",
      amount: "99.00",
      item_name: "flippinCalendar Pro",
      m_payment_id: "fc:org-1:pro:1",
    };

    const shuffled = {
      amount: fields.amount,
      merchant_id: fields.merchant_id,
      m_payment_id: fields.m_payment_id,
      item_name: fields.item_name,
      merchant_key: fields.merchant_key,
    };

    const signature = generatePayfastSignature(fields, passphrase);
    expect(generatePayfastSignature(shuffled, passphrase)).toBe(signature);
    expect(signature).toHaveLength(32);
  });

  it("verifies ITN signatures using posted field order", () => {
    const passphrase = "test-pass";
    const itn = {
      m_payment_id: "fc:org-1:pro:1",
      pf_payment_id: "12345",
      payment_status: "COMPLETE",
      amount_gross: "99.00",
      custom_str1: "org-uuid",
      custom_str2: "pro",
    };
    const signature = generatePayfastItnSignature(itn, passphrase);
    expect(verifyPayfastSignature({ ...itn, signature }, passphrase)).toBe(true);
  });

  it("charges R99 for Pro", () => {
    expect(billingPlanAmountCents.pro).toBe(9900);
  });
});
