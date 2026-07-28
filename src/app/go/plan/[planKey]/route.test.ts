import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

describe("GET /go/plan/[planKey]", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("redirects unknown plan keys back to pricing", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/nope"), {
      params: Promise.resolve({ planKey: "nope" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pricing");
  });

  it("redirects signed-out users to sign-up and stores paid plan intent cookie", async () => {
    authMock.mockResolvedValue({ userId: null, orgSlug: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/pro"), {
      params: Promise.resolve({ planKey: "pro" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://example.com/sign-up?plan=pro",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=pro");
  });

  it("redirects signed-in users with org to billing checkout", async () => {
    authMock.mockResolvedValue({ userId: "user_123", orgSlug: "acme" });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/go/plan/voice"),
      {
        params: Promise.resolve({ planKey: "voice" }),
      },
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/app/acme/billing?plan=voice&checkout=1",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=voice");
  });

  it("redirects signed-in users without org to app entry with plan", async () => {
    authMock.mockResolvedValue({ userId: "user_123", orgSlug: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/pro"), {
      params: Promise.resolve({ planKey: "pro" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://example.com/app?plan=pro",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=pro");
  });

  it("clears plan intent cookie for free plan", async () => {
    authMock.mockResolvedValue({ userId: "user_123", orgSlug: "acme" });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/core"), {
      params: Promise.resolve({ planKey: "core" }),
    });

    expect(response.headers.get("location")).toBe("https://example.com/app/acme");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain(
      "fc_plan_intent=;",
    );
  });
});
