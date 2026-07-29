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
  hasAiAgent: false,
  isLoaded: true,
};

const workspaceState = {
  organization: { _id: "org_1", name: "Acme", timezone: "UTC", slug: "acme" },
  orgSlug: "acme",
  terminology: { booking: "Bookings" },
  isBootstrapping: false,
};

const useServerDataMock = vi.fn();

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
  FeatureEntitlementCard: () => <div data-testid="feature-card" />,
  AiAgentPlanLock: ({ orgSlug }: { orgSlug: string }) => (
    <div data-testid="ai-agent-plan-lock">
      <a href={`/app/${orgSlug}/billing`}>Compare plans</a>
      <p>AI Agent is on Pro and Voice</p>
    </div>
  ),
  useFeatureEntitlements: () => entitlementState,
}));

vi.mock("@/components/dashboard/workspace-context", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@/hooks/use-server-data", () => ({
  useServerData: (...args: unknown[]) => useServerDataMock(...args),
}));

vi.mock("@/app/actions/dashboard", () => ({
  getConversationAnalyticsAction: vi.fn(),
  getConversationDetailAction: vi.fn(),
  getCurrentAgentAction: vi.fn(),
  getCurrentDraftAction: vi.fn(),
  listRecentConversationsAction: vi.fn(),
  publishSiteAction: vi.fn().mockResolvedValue(undefined),
  updateDraftAction: vi.fn().mockResolvedValue(undefined),
  syncRecentConversationsAction: vi.fn().mockResolvedValue({ imported: 0, scanned: 0 }),
}));

vi.mock("@/components/dashboard/agent-configure-wizard", () => ({
  AgentConfigureWizard: () => <div data-testid="agent-configure-wizard" />,
}));

function setServerDataResponses(options: {
  webEnabled: boolean;
  conversations?: Array<{ _id: string; startedAt: string; caller?: string | null; summary?: string | null }>;
}) {
  let call = 0;
  useServerDataMock.mockImplementation(() => {
    // VoiceAgentScreen: agent, analytics, conversations, siteDraft; detail dialog is 5th.
    const slot = call % 5;
    call += 1;
    if (slot === 0) return { integration: { webEnabled: options.webEnabled } };
    if (slot === 1)
      return {
        last7Days: 0,
        last30Days: 0,
        last30DaysIsCapped: false,
        averageDurationSeconds: 0,
        outcomes: [],
      };
    if (slot === 2) return options.conversations ?? [];
    if (slot === 3)
      return {
        site: {
          siteSlug: "acme",
          draft: {
            businessName: "Acme",
            agent: {
              showWebChat: true,
              showVoiceChat: false,
              showElevenLabsWidget: false,
              welcomeMessage: "Hello",
              persona: "front_desk",
              voicePreset: "eric",
              turnEagerness: "normal",
              language: "en",
            },
          },
        },
      };
    return null;
  });
}

describe("dashboard voice-agent action buttons", () => {
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
    useServerDataMock.mockReset();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("locks the full AI Agent screen on Core (no web_agent / browser_voice)", () => {
    setServerDataResponses({ webEnabled: true });
    render(<VoiceAgentScreen />);
    expect(screen.getByTestId("ai-agent-plan-lock")).toBeInTheDocument();
    expect(
      screen.getByText("AI Agent is on Pro and Voice"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start voice test" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("agent-configure-wizard"),
    ).not.toBeInTheDocument();
  });

  it(
    "routes disabled browser voice state to Compare plans",
    () => {
      entitlementState.webAgent = true;
      entitlementState.hasAiAgent = true;
      setServerDataResponses({ webEnabled: true });
      render(<VoiceAgentScreen />);
      expect(
        screen.getByRole("link", { name: "Compare plans" }),
      ).toHaveAttribute("href", "/app/acme/billing");
    },
    15_000,
  );

  it("routes setup-incomplete state to Open settings", () => {
    entitlementState.webAgent = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: false });
    render(<VoiceAgentScreen />);
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/app/acme/settings",
    );
  });

  it("shows pending state while connecting a voice test", () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: true });
    statusState.status = "connecting";

    render(<VoiceAgentScreen />);
    const startButton = screen.getByRole("button", { name: "Connecting…" });
    expect(startButton).toBeDisabled();
  });

  it("waits for entitlement load before offering Compare plans", () => {
    entitlementState.isLoaded = false;
    entitlementState.hasAiAgent = false;
    setServerDataResponses({ webEnabled: true });
    render(<VoiceAgentScreen />);
    expect(
      screen.queryByRole("link", { name: "Compare plans" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Checking business plan…")).toBeInTheDocument();
  });

  it("shows actionable error when microphone access fails", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: true });

    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new Error("Microphone blocked by browser")),
      },
    });

    render(<VoiceAgentScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Start voice test" }));

    expect(
      await screen.findByText("Microphone blocked by browser"),
    ).toBeInTheDocument();
  });

  it("shows session API entitlement error and never starts ElevenLabs", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: true });

    const trackStop = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: trackStop }],
        }),
      },
    });
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "This organization’s plan does not include browser voice.",
      }),
    } as Response);

    render(<VoiceAgentScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Start voice test" }));

    expect(
      await screen.findByText(
        "This organization’s plan does not include browser voice.",
      ),
    ).toBeInTheDocument();
    expect(controls.startSession).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalled();
  });

  it("starts voice test after mic permission and signed session URL", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: true });

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
    await userEvent.click(screen.getByRole("button", { name: "Start voice test" }));

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

  it("disables end button while stop is pending", async () => {
    entitlementState.browserVoice = true;
    entitlementState.hasAiAgent = true;
    setServerDataResponses({ webEnabled: true });
    statusState.status = "connected";

    let resolveEnd: (() => void) | undefined;
    controls.endSession.mockImplementation(
      (() =>
        new Promise<void>((resolve) => {
          resolveEnd = resolve;
        })) as () => Promise<void>,
    );
    controls.getId.mockReturnValue("conv_dash_1");
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<VoiceAgentScreen />);
    const endButton = screen.getByRole("button", { name: /End test/i });
    await userEvent.click(endButton);

    expect(endButton).toBeDisabled();

    await waitFor(() => {
      expect(controls.endSession).toHaveBeenCalledOnce();
    });
    if (!resolveEnd) {
      throw new Error("End-session resolver was not initialized.");
    }
    const completeEnd = resolveEnd;
    completeEnd();
  });
});
