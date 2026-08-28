import { createHash } from "node:crypto";

/** PayFast custom-integration field order (NOT alphabetical). */
const PAYFAST_CHECKOUT_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles",
] as const;

function payfastEncode(value: string): string {
  // PayFast expects PHP urlencode semantics (not raw encodeURIComponent).
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%27/g, "'")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2A/g, "*")
    .replace(/%7E/g, "~");
}

function orderedCheckoutKeys(data: Record<string, string>): string[] {
  const present = new Set(
    Object.keys(data).filter((key) => key !== "signature"),
  );
  const ordered = PAYFAST_CHECKOUT_FIELD_ORDER.filter((key) => present.has(key));
  const extras = [...present].filter(
    (key) => !PAYFAST_CHECKOUT_FIELD_ORDER.includes(key as (typeof PAYFAST_CHECKOUT_FIELD_ORDER)[number]),
  );
  return [...ordered, ...extras];
}

function buildParamString(
  data: Record<string, string>,
  keys: string[],
  passphrase?: string,
): string {
  const pairs: string[] = [];
  for (const key of keys) {
    const value = data[key];
    if (value === "" || value === undefined || value === null) continue;
    pairs.push(`${key}=${payfastEncode(String(value))}`);
  }

  let paramString = pairs.join("&");
  if (passphrase) {
    paramString += `&passphrase=${payfastEncode(passphrase)}`;
  }
  return paramString;
}

/** Checkout form signature — fields in PayFast documentation order. */
export function generatePayfastSignature(
  data: Record<string, string>,
  passphrase?: string,
): string {
  const paramString = buildParamString(
    data,
    orderedCheckoutKeys(data),
    passphrase,
  );
  return createHash("md5").update(paramString).digest("hex");
}

/**
 * ITN signature — fields in POST order up to (but excluding) `signature`,
 * matching PayFast's PHP integration examples.
 */
export function generatePayfastItnSignature(
  data: Record<string, string>,
  passphrase?: string,
): string {
  const keys: string[] = [];
  for (const key of Object.keys(data)) {
    if (key === "signature") break;
    keys.push(key);
  }
  const paramString = buildParamString(data, keys, passphrase);
  return createHash("md5").update(paramString).digest("hex");
}

export function verifyPayfastSignature(
  data: Record<string, string>,
  passphrase?: string,
): boolean {
  const received = data.signature?.trim();
  if (!received) return false;
  const expected = generatePayfastItnSignature(data, passphrase);
  return received === expected;
}
