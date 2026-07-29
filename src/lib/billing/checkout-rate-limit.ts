import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { iso } from "@/lib/data/auth";

const CHECKOUT_LIMIT_PER_ORG_HOUR = 10;
const CHECKOUT_LIMIT_PER_USER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

async function incrementCheckoutWindow(
  organizationId: string,
  scopeKey: string,
  limit: number,
  windowStart: number,
  expiresAt: number,
) {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("billing_checkout_rate_limits")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("scope_key", scopeKey)
    .eq("window_start", windowStart)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (row && row.count >= limit) {
    throw new Error(
      "Too many checkout attempts. Please wait a few minutes and try again.",
    );
  }

  if (row) {
    const { error: updateError } = await supabase
      .from("billing_checkout_rate_limits")
      .update({ count: row.count + 1 })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: insertError } = await supabase
    .from("billing_checkout_rate_limits")
    .insert({
      organization_id: organizationId,
      scope_key: scopeKey,
      window_start: windowStart,
      count: 1,
      expires_at: iso(expiresAt),
    });
  if (insertError) throw new Error(insertError.message);
}

export async function assertBillingCheckoutRateLimit(args: {
  organizationId: string;
  userId: string;
}) {
  const windowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  const expiresAt = windowStart + WINDOW_MS * 2;

  await incrementCheckoutWindow(
    args.organizationId,
    "org-checkout",
    CHECKOUT_LIMIT_PER_ORG_HOUR,
    windowStart,
    expiresAt,
  );
  await incrementCheckoutWindow(
    args.organizationId,
    `user:${args.userId}`,
    CHECKOUT_LIMIT_PER_USER_HOUR,
    windowStart,
    expiresAt,
  );
}
