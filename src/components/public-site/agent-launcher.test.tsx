import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentLauncher } from "@/components/public-site/agent-launcher";

const controls = {
  startSession: vi.fn(),
  endSession: vi.fn(),
  sendUserMessage: vi.fn(),
  getId: vi.fn<() => string | null>(() => null),
};

const statusState: { status: "disconnected" | "connecting" | "connected"; message?: string } =
  {
    status: "disconnected",
    message: undefined,
  };

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: ReactNode }) => children,
  useConversationControls: () => controls,
  useConversationMode: () => ({ mode: "listening" }),
  useConversationStatus: () => ({
    status: statusState.status,
    message: statusState.message,
  }),
}));

vi.mock("@/components/public-site/agent-tools", () => ({
  AgentClientToolRegistrar: () => null,
}));

function defaultProps() {
  return {
    siteSlug: "acme",
    businessName: "Acme Studio",
    welcomeMessage: "Hello!",
    textEnabled: true,
    voiceEnabled: true,
    offerings: [],
    teamMembers: [],
    timezone: "UTC",
    locale: "en",
  };
}

describe("public agent session buttons", () => {
  beforeEach(() => {
    controls.startSession.mockReset();
    controls.endSession.mockReset();
    controls.sendUserMessage.mockReset();
    controls.getId.mockReset();
    controls.getId.mockReturnValue(null);
    statusState.status = "disconnected";
    statusState.message = undefined;
    vi.restoreAllMocks();
  });

  it("shows text and voice buttons only when each mode is enabled", () => {
    const { rerender } = render(
      <AgentLauncher {...defaultProps()} textEnabled voiceEnabled={false} />,
    );
    expect(screen.getByRole("button", { name: "Chat with AI" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Speak with AI" }),
    ).not.toBeInTheDocument();

    rerender(<AgentLauncher {...defaultProps()} textEnabled={false} voiceEnabled />);
    expect(
      screen.queryByRole("button", { name: "Chat with AI" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Speak with AI" }),
    ).toBeInTheDocument();
  }, 15_000);

  it("shows entitlement error message when text session request is rejected", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "This organization’s plan does not include AI text chat.",
      }),
    } as Response);

    render(<AgentLauncher {...defaultProps()} />);
    await userEvent.click(screen.getByRole("button", { name: "Chat with AI" }));

    expect(
      await screen.findByText(
        "This organization’s plan does not include AI text chat.",
      ),
    ).toBeInTheDocument();
    expect(controls.startSession).not.toHaveBeenCalled();
  });

  it("disables buttons while an outgoing session is pending", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    vi.spyOn(global, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }) as Promise<Response>,
    );
    controls.startSession.mockResolvedValue(undefined);

    render(<AgentLauncher {...defaultProps()} />);
    const chatButton = screen.getByRole("button", { name: "Chat with AI" });
    await userEvent.click(chatButton);

    expect(chatButton).toBeDisabled();
    expect(screen.getByText("Connecting securely…")).toBeInTheDocument();

    if (!resolveFetch) {
      throw new Error("Fetch resolver was not initialized.");
    }
    const completeFetch: (value: Response) => void = resolveFetch;
    completeFetch({
      ok: true,
      json: async () => ({
        signedUrl: "https://example.com/signed",
        dynamicVariables: {},
      }),
    } as Response);

    await waitFor(() => {
      expect(controls.startSession).toHaveBeenCalledOnce();
    });
  });

  it("shows entitlement error when voice session request is rejected", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "This organization’s plan does not include browser voice.",
      }),
    } as Response);

    render(<AgentLauncher {...defaultProps()} />);
    await userEvent.click(screen.getByRole("button", { name: "Speak with AI" }));

    expect(
      await screen.findByText(
        "This organization’s plan does not include browser voice.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/acme/agent-session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ mode: "voice" }),
      }),
    );
    expect(controls.startSession).not.toHaveBeenCalled();
  });

  it("starts a text session with signed URL from the session API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        signedUrl: "wss://example.com/signed",
        dynamicVariables: { site_slug: "acme", business_name: "Acme Studio" },
      }),
    } as Response);
    controls.startSession.mockResolvedValue(undefined);

    render(<AgentLauncher {...defaultProps()} />);
    await userEvent.click(screen.getByRole("button", { name: "Chat with AI" }));

    await waitFor(() => {
      expect(controls.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          signedUrl: "wss://example.com/signed",
          connectionType: "websocket",
          textOnly: true,
        }),
      );
    });
  });

  it("disables end button while stopping an active session", async () => {
    statusState.status = "connected";
    let resolveEnd: (() => void) | null = null;
    controls.endSession.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveEnd = resolve;
        }),
    );
    controls.getId.mockReturnValue("conv_public_1");
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<AgentLauncher {...defaultProps()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "End conversation" }),
    );

    expect(
      await screen.findByRole("button", { name: "Ending conversation…" }),
    ).toBeDisabled();

    await waitFor(() => {
      expect(controls.endSession).toHaveBeenCalledOnce();
    });
    if (!resolveEnd) {
      throw new Error("End-session resolver was not initialized.");
    }
    const completeEnd: () => void = resolveEnd;
    completeEnd();
  });

  it("requests microphone permission after voice entitlement succeeds", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia },
    });
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        signedUrl: "wss://example.com/signed",
        dynamicVariables: {},
      }),
    } as Response);
    controls.startSession.mockResolvedValue(undefined);

    render(<AgentLauncher {...defaultProps()} />);
    await userEvent.click(screen.getByRole("button", { name: "Speak with AI" }));

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(controls.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          signedUrl: "wss://example.com/signed",
          textOnly: false,
        }),
      );
    });
  });
});
