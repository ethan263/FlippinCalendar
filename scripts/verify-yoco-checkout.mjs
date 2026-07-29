/**
 * Smoke-test Yoco Checkout API (POST /api/checkouts).
 * Usage: YOCO_CHECKOUT_SECRET_KEY=yoco_live_... node scripts/verify-yoco-checkout.mjs
 *
 * Never commit keys. Rotate if exposed.
 */
const secretKey = process.env.YOCO_CHECKOUT_SECRET_KEY?.trim();
if (!secretKey) {
  console.error("Set YOCO_CHECKOUT_SECRET_KEY first.");
  process.exit(1);
}

const origin =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.flippincalendar.co.za";
const idempotencyKey = `verify-${Date.now()}`;

const body = {
  amount: 24900,
  currency: "ZAR",
  successUrl: `${origin}/app/test-org/billing?checkout=success&plan=pro`,
  cancelUrl: `${origin}/app/test-org/billing?checkout=cancelled`,
  failureUrl: `${origin}/app/test-org/billing?checkout=failed`,
  clientReferenceId: "verify-checkout-smoke",
  externalId: "verify-checkout-smoke",
  metadata: { source: "verify-yoco-checkout-script", plan: "pro" },
  lineItems: [
    {
      displayName: "flippinCalendar pro (verify)",
      quantity: 1,
      pricingDetails: { price: 24900 },
    },
  ],
};

const response = await fetch("https://payments.yoco.com/api/checkouts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  },
  body: JSON.stringify(body),
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (!response.ok) {
  console.error("Checkout failed:", response.status, JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      id: json.id,
      status: json.status,
      processingMode: json.processingMode,
      redirectUrl: json.redirectUrl,
      amount: json.amount,
      currency: json.currency,
    },
    null,
    2,
  ),
);
