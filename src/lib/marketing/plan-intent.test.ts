import { describe, expect, it } from "vitest";

import {
  buildAfterOrganizationUrl,
  buildAppEntryUrl,
  buildBillingCheckoutUrl,
  buildPlanChoiceHref,
  normalizePlanIntent,
} from "@/lib/marketing/plan-intent";

describe("plan choice routing intent", () => {
  it("normalizes known plan keys and clerk slugs", () => {
    expect(normalizePlanIntent("pro")).toMatchObject({
      key: "pro",
      clerkPlanSlug: "engage",
    });
    expect(normalizePlanIntent("voice")).toMatchObject({
      key: "voice",
      clerkPlanSlug: "voice",
    });
    expect(normalizePlanIntent("free_org")).toMatchObject({
      key: "core",
      clerkPlanSlug: "free_org",
    });
  });

  it("always routes Choose plan through go/plan intent router", () => {
    expect(
      buildPlanChoiceHref({ planKey: "pro", signedIn: true, orgSlug: "acme" }),
    ).toBe("/go/plan/pro");
    expect(buildPlanChoiceHref({ planKey: "voice", signedIn: false })).toBe(
      "/go/plan/voice",
    );
  });

  it("documents that plan choice hrefs require hard navigation", () => {
    // Soft next/link navigations do not reliably follow Route Handler redirects.
    const href = buildPlanChoiceHref({ planKey: "pro" });
    expect(href.startsWith("/go/plan/")).toBe(true);
  });

  it("builds post-auth and billing URLs for paid plans", () => {
    const paidPlan = normalizePlanIntent("pro");
    expect(paidPlan).not.toBeNull();
    expect(buildAppEntryUrl(paidPlan)).toBe("/app?plan=pro");
    expect(buildAfterOrganizationUrl(paidPlan)).toBe(
      "/app/:slug/billing?plan=pro&checkout=1",
    );
    expect(buildBillingCheckoutUrl("acme", paidPlan!)).toBe(
      "/app/acme/billing?plan=pro&checkout=1",
    );
  });

  it("keeps free plan on app entry without checkout params", () => {
    const freePlan = normalizePlanIntent("core");
    expect(freePlan).not.toBeNull();
    expect(buildAfterOrganizationUrl(freePlan)).toBe("/app/:slug");
    expect(buildBillingCheckoutUrl("acme", freePlan!)).toBe("/app/acme");
  });
});
