import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VoiceAgentScreen } from "@/components/dashboard/voice-agent-screen";

const statusState: { status: "disconnected" | "connecting" | "connected" } = {
  status: "disconnected",
};

const controls = {
  startSession: vi.fn(),
  endSession: vi.fn(),
  getId: vi.fn(() => null as string | null),
};

const entitlementState = {
  browserVoice: false,
  webAgent: false,
  advancedAnalytics: false,
  hasAiAgent: false,
  isLoaded: true,
  plan: "core" as const,
  pendingPlan: null,
};

const workspaceState = {
  organization: { _id: "org_1", name: "Acme", timezone: "UTC", slug: "acme" },
  orgSlug: "acme",
  terminology: { booking: "Bookings" },
  isBootstrapping: false,
};

const siteDraft = {
  site: {
    siteSlug: "acme",
    publishedAt: null,
    draft: {
      businessName: "Acme",
      agent: {
        showWebChat: true,
        showVoiceChat: false,
        welcomeMessage: "Hello",
        persona: "front_desk",
        voicePreset: "eric",
        turnEagerness: "normal",
        language: "en",
      },
    },
  },
};

const refreshableDataMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: ReactNode }) => children,
  useConversationControls: () => controls,
  useConversationStatus: () => ({ status: statusState.status }),
}));

vi.mock("@/components/dashboard/feature-gates", () => ({
  useFeatureEntitlements: () => entitlementState,
}));

vi.mock("@/components/dashboard/workspace-context", () => ({
  useWorkspace: () => workspaceState,
  useWorkspaceReady: () => true,
}));

vi.mock("@/components/dashboard/platform-refresh-context", () => ({
  usePlatformRefresh: () => ({
    draftVersion: 0,
    refreshDraft: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-server-data", () => ({
  useServerData: (loader: () => unknown) => {
    if (String(loader).includes("getConversationAnalytics")) {
      return null;
    }
    return undefined;
  },
  useRefreshableServerData: (...args: unknown[]) => refreshableDataMock(...args),
}));

vi.mock("@/hooks/use-live-refresh", () => ({
  useLiveRefreshableServerData: (...args: unknown[]) => refreshableDataMock(...args),
}));

vi.mock("@/components/public-site/agent-tools", () => ({
  AgentClientToolRegistrar: () => null,
}));

vi.mock("@/app/actions/dashboard", () => ({
  getCurrentDraftAction: vi.fn(),
  getAgentClientToolContextAction: vi.fn().mockResolvedValue({
    siteSlug: "acme",
    businessName: "Acme",
    offerings: [],
    teamMembers: [],
    timezone: "UTC",
    locale: "en-US",
  }),
  listRecentConversationsAction: vi.fn(),
  publishSiteAction: vi.fn().mockResolvedValue({ siteSlug: "acme" }),
  updateDraftAction: vi.fn().mockResolvedValue(undefined),
  syncRecentConversationsAction: vi
    .fn()
    .mockResolvedValue({ imported: 0, scanned: 0 }),
}));

vi.mock("@/components/dashboard/agent-configure-wizard", () => ({
  AgentConfigureWizard: () => <div data-testid="agent-configure-wizard" />,
}));

vi.mock("@/components/dashboard/ai-agent-plan-overlay", () => ({
  AiAgentPlanOverlay: ({ orgSlug }: { orgSlug: string }) => (
    <div data-testid="ai-agent-plan-overlay">
      <a href={`/app/${orgSlug}/billing?plan=pro&upgrade=1`}>Upgrade to Pro</a>
    </div>
  ),
}));

describe("VoiceAgentScreen", () => {
  beforeEach(() => {
    statusState.status = "disconnected";
    entitlementState.browserVoice = false;
    entitlementState.webAgent = false;
    entitlementState.hasAiAgent = false;
    entitlementState.isLoaded = true;
    controls.startSession.mockReset();
    controls.endSession.mockReset();
    controls.getId.mockReset();
    controls.getId.mockReturnValue(null);
    refreshableDataMock.mockReset();
    refreshableDataMock.mockImplementation((loader: () => unknown) => {
      const loaderText = String(loader);
      if (loaderText.includes("listRecentConversations")) {
        return { data: [], refresh: vi.fn() };
      }
      if (loaderText.includes("getConversationAnalytics")) {
        return { data: null, refresh: vi.fn() };
      }
      return { data: siteDraft, refresh: vi.fn() };
    });
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows configure wizard for Pro users", () => {
    entitlementState.hasAiAgent = true;
    entitlementState.webAgent = true;
    render(<VoiceAgentScreen />);
    expect(screen.queryByTestId("ai-agent-plan-overlay")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-configure-wizard")).toBeInTheDocument();
  }, 15_000);

  it("shows Pro lock overlay for Core users", () => {
    render(<VoiceAgentScreen />);
    expect(screen.getByTestId("ai-agent-plan-overlay")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Upgrade to Pro" }),
    ).toHaveAttribute("href", "/app/acme/billing?plan=pro&upgrade=1");
  });

  it("opens voice test dialog for Pro users with browser voice", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    render(<VoiceAgentScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Test voice" }));
    expect(screen.getByRole("button", { name: "Start test" })).toBeInTheDocument();
  });

  it("shows microphone error inside the test dialog", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;

    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new Error("Microphone blocked by browser")),
      },
    });

    render(<VoiceAgentScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Test voice" }));
    await userEvent.click(screen.getByRole("button", { name: "Start test" }));

    expect(
      await screen.findByText("Microphone blocked by browser"),
    ).toBeInTheDocument();
  });

  it("starts voice test after mic permission and signed session URL", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;

    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        signedUrl: "wss://example.com/app-signed",
        dynamicVariables: { org_slug: "acme" },
      }),
    } as Response);
    controls.startSession.mockResolvedValue(undefined);

    render(<VoiceAgentScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Test voice" }));
    await userEvent.click(screen.getByRole("button", { name: "Start test" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/app/agent-session", {
        method: "POST",
      });
      expect(controls.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          signedUrl: "wss://example.com/app-signed",
          connectionType: "websocket",
        }),
      );
    });
  });
});
