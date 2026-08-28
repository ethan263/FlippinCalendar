import { describe, expect, it } from "vitest";

import {
  getPlanEntitlements,
  planIncludesFeature,
} from "@/lib/billing/features";

describe("plan entitlements", () => {
  it("locks all AI on Core and unlocks everything on Pro", () => {
    const core = getPlanEntitlements("core");
    const pro = getPlanEntitlements("pro");

    expect(core.hasAiAgent).toBe(false);
    expect(core.webAgent).toBe(false);
    expect(core.browserVoice).toBe(false);
    expect(core.advancedAnalytics).toBe(false);
    expect(core.operationsHub).toBe(true);
    expect(core.customPublicPage).toBe(true);

    expect(pro.hasAiAgent).toBe(true);
    expect(pro.webAgent).toBe(true);
    expect(pro.browserVoice).toBe(true);
    expect(pro.advancedAnalytics).toBe(true);
    expect(planIncludesFeature("pro", "web_agent")).toBe(true);
    expect(planIncludesFeature("pro", "browser_voice")).toBe(true);
    expect(planIncludesFeature("pro", "advanced_analytics")).toBe(true);
    expect(planIncludesFeature("core", "web_agent")).toBe(false);
  });
});
