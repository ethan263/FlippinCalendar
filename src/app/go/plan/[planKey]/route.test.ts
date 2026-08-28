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

  it("redirects signed-out users to sign-in and stores paid plan intent cookie", async () => {
    authMock.mockResolvedValue({ userId: null, orgSlug: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/pro"), {
      params: Promise.resolve({ planKey: "pro" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://example.com/sign-in?plan=pro",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=pro");
  });

  it("redirects pro plan to pro billing checkout", async () => {
    authMock.mockResolvedValue({ userId: "user_123", orgSlug: "acme" });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/go/plan/pro"),
      {
        params: Promise.resolve({ planKey: "pro" }),
      },
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/app/acme/billing?plan=pro&upgrade=1",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=pro");
  });

  it("maps legacy engage slug to pro billing checkout", async () => {
    authMock.mockResolvedValue({ userId: "user_123", orgSlug: "acme" });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/go/plan/engage"), {
      params: Promise.resolve({ planKey: "engage" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://example.com/app/acme/billing?plan=pro&upgrade=1",
    );
    expect(response.headers.get("set-cookie")).toContain("fc_plan_intent=pro");
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
