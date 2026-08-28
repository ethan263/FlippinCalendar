import { describe, expect, it } from "vitest";

import {
  resolveEntitlementsFromSubscription,
  subscriptionGrantsAccess,
  type OrganizationSubscription,
} from "@/lib/billing/subscriptions";

function subscription(
  overrides: Partial<OrganizationSubscription> = {},
): OrganizationSubscription {
  return {
    organizationId: "org-1",
    plan: "pro",
    pendingPlan: null,
    status: "active",
    currentPeriodStart: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2026-02-01T00:00:00.000Z",
    payfastMPaymentId: null,
    payfastPaymentId: null,
    ...overrides,
  };
}

describe("subscriptionGrantsAccess", () => {
  it("allows active and pending checkout", () => {
    expect(subscriptionGrantsAccess(subscription({ status: "active" }))).toBe(
      true,
    );
    expect(
      subscriptionGrantsAccess(
        subscription({
          status: "pending",
          plan: "core",
          pendingPlan: "pro",
        }),
      ),
    ).toBe(true);
  });

  it("allows past_due only inside the paid period", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();

    expect(
      subscriptionGrantsAccess(
        subscription({ status: "past_due", currentPeriodEnd: future }),
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsAccess(
        subscription({ status: "past_due", currentPeriodEnd: past }),
      ),
    ).toBe(false);
  });

  it("denies cancelled subscriptions", () => {
    expect(subscriptionGrantsAccess(subscription({ status: "cancelled" }))).toBe(
      false,
    );
  });
});

describe("resolveEntitlementsFromSubscription", () => {
  it("grants all AI features on Pro when access is active", () => {
    const entitlements = resolveEntitlementsFromSubscription(
      subscription({ plan: "pro", status: "active" }),
    );
    expect(entitlements.webAgent).toBe(true);
    expect(entitlements.browserVoice).toBe(true);
    expect(entitlements.advancedAnalytics).toBe(true);
    expect(entitlements.hasAiAgent).toBe(true);
  });

  it("denies AI features on Core", () => {
    const entitlements = resolveEntitlementsFromSubscription(
      subscription({ plan: "core", status: "active" }),
    );
    expect(entitlements.webAgent).toBe(false);
    expect(entitlements.browserVoice).toBe(false);
    expect(entitlements.hasAiAgent).toBe(false);
  });

  it("does not grant paid features during pending checkout on Core", () => {
    const entitlements = resolveEntitlementsFromSubscription(
      subscription({
        plan: "core",
        pendingPlan: "pro",
        status: "pending",
      }),
    );
    expect(entitlements.webAgent).toBe(false);
    expect(entitlements.browserVoice).toBe(false);
  });

  it("denies Pro features when past_due period has expired", () => {
    const entitlements = resolveEntitlementsFromSubscription(
      subscription({
        plan: "pro",
        status: "past_due",
        currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    );
    expect(entitlements.webAgent).toBe(false);
    expect(entitlements.browserVoice).toBe(false);
    expect(entitlements.hasAiAgent).toBe(false);
  });

  it("defaults to Core entitlements when subscription row is missing", () => {
    const entitlements = resolveEntitlementsFromSubscription(null);
    expect(entitlements.plan).toBe("core");
    expect(entitlements.webAgent).toBe(false);
    expect(entitlements.browserVoice).toBe(false);
  });
});
