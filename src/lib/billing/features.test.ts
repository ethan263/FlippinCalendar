import { describe, expect, it } from "vitest";

import {
  getPlanEntitlements,
  planIncludesFeature,
} from "@/lib/billing/features";

describe("plan entitlements", () => {
  it("grants AI concierge features on Pro only", () => {
    const core = getPlanEntitlements("core");
    const pro = getPlanEntitlements("pro");

    expect(core.hasAiAgent).toBe(false);
    expect(core.webAgent).toBe(false);
    expect(core.browserVoice).toBe(false);
    expect(core.operationsHub).toBe(true);
    expect(core.customPublicPage).toBe(true);

    expect(pro.hasAiAgent).toBe(true);
    expect(pro.webAgent).toBe(true);
    expect(pro.browserVoice).toBe(true);
    expect(planIncludesFeature("pro", "web_agent")).toBe(true);
    expect(planIncludesFeature("core", "web_agent")).toBe(false);
  });
});
