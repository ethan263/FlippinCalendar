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
  listRecentConversationsAction: vi.fn(),
  syncRecentConversationsAction: vi.fn().mockResolvedValue({ imported: 0, scanned: 0 }),
}));

function setServerDataResponses(options: {
  webEnabled: boolean;
  conversations?: Array<{ _id: string; startedAt: string; caller?: string | null; summary?: string | null }>;
}) {
  let call = 0;
  useServerDataMock.mockImplementation(() => {
    // VoiceAgentScreen calls useServerData 3× per render; ConversationDetailDialog adds a 4th.
    const slot = call % 4;
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
    return null;
  });
}

describe("dashboard voice-agent action buttons", () => {
  beforeEach(() => {
    statusState.status = "disconnected";
    entitlementState.browserVoice = false;
    entitlementState.webAgent = false;
    entitlementState.isLoaded = true;
    controls.startSession.mockReset();
    controls.endSession.mockReset();
    controls.getId.mockReset();
    controls.getId.mockReturnValue(null);
    useServerDataMock.mockReset();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it(
    "routes disabled browser voice state to Compare plans",
    () => {
      setServerDataResponses({ webEnabled: true });
      render(<VoiceAgentScreen />);
      expect(
        screen.getByRole("link", { name: "Compare plans" }),
      ).toHaveAttribute("href", "/app/acme/billing");
    },
    15_000,
  );

  it("routes setup-incomplete state to Open settings", () => {
    setServerDataResponses({ webEnabled: false });
    render(<VoiceAgentScreen />);
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/app/acme/settings",
    );
  });

  it("shows pending state while connecting a voice test", () => {
    entitlementState.browserVoice = true;
    setServerDataResponses({ webEnabled: true });
    statusState.status = "connecting";

    render(<VoiceAgentScreen />);
    const startButton = screen.getByRole("button", { name: "Connecting…" });
    expect(startButton).toBeDisabled();
  });

  it("waits for entitlement load before offering Compare plans", () => {
    entitlementState.isLoaded = false;
    setServerDataResponses({ webEnabled: true });
    render(<VoiceAgentScreen />);
    expect(
      screen.queryByRole("link", { name: "Compare plans" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Checking organization plan…")).toBeInTheDocument();
  });

  it("shows actionable error when microphone access fails", async () => {
    entitlementState.browserVoice = true;
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
