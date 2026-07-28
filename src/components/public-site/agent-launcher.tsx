"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  AudioLines,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageCircle,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";

import {
  AgentClientToolRegistrar,
  type AgentToolEvent,
  type AgentToolActivity,
  type AgentToolName,
} from "@/components/public-site/agent-tools";
import type {
  PublicOffering,
  PublicTeamMember,
} from "@/components/public-site/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SessionAgentOverrides } from "@/lib/elevenlabs/free-plan-presets";
import { cn } from "@/lib/utils";

type SessionResponse = {
  signedUrl?: string;
  dynamicVariables?: Record<string, string>;
  overrides?: SessionAgentOverrides;
};

type ChatMessage = {
  kind: "message";
  id: string;
  role: "user" | "agent";
  text: string;
};

type ChatToolCall = AgentToolEvent & {
  kind: "tool";
};

type ChatTimelineItem = ChatMessage | ChatToolCall;

type AgentLauncherProps = {
  siteSlug: string;
  businessName: string;
  welcomeMessage: string;
  textEnabled: boolean;
  voiceEnabled: boolean;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
};

function activityTitle(kind: AgentToolActivity["kind"]) {
  if (kind === "booked") return "Booking confirmed";
  if (kind === "rescheduled") return "Booking rescheduled";
  if (kind === "canceled") return "Booking canceled";
  return "Booking found";
}

const TOOL_LABELS: Record<AgentToolName, string> = {
  get_business_info: "Loading business details",
  get_availability: "Checking availability",
  book_appointment: "Creating booking",
  lookup_appointment: "Finding booking",
  reschedule_appointment: "Rescheduling booking",
  cancel_appointment: "Canceling booking",
};

function ToolCallItem({ item }: { item: ChatToolCall }) {
  const isRunning = item.status === "running";
  const isFailed = item.status === "failed";

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-background/75 px-3 py-2.5 shadow-sm",
        isFailed ? "border-destructive/25" : "border-foreground/10",
      )}
      aria-label={`${TOOL_LABELS[item.name]}: ${item.status}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground",
            isRunning && "bg-primary/10 text-primary",
            isFailed && "bg-destructive/10 text-destructive",
          )}
        >
          {isRunning ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : isFailed ? (
            <CircleAlert className="size-3.5" aria-hidden="true" />
          ) : (
            <Wrench className="size-3.5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-semibold">{TOOL_LABELS[item.name]}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.62rem] text-muted-foreground">
              {item.name}
            </code>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {item.inputSummary}
          </p>
          {item.resultSummary ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-5",
                isFailed ? "text-destructive" : "text-foreground",
              )}
            >
              {item.resultSummary}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[0.58rem] uppercase tracking-wider",
            isRunning && "border-primary/20 text-primary",
            isFailed && "border-destructive/20 text-destructive",
          )}
        >
          {isRunning ? "Running" : isFailed ? "Failed" : "Done"}
        </Badge>
      </div>
    </div>
  );
}

function AgentLauncherInner({
  siteSlug,
  businessName,
  welcomeMessage,
  textEnabled,
  voiceEnabled,
  timeline,
  toolActivity,
  clearTimeline,
  addUserMessage,
}: {
  siteSlug: string;
  businessName: string;
  welcomeMessage: string;
  textEnabled: boolean;
  voiceEnabled: boolean;
  timeline: ChatTimelineItem[];
  toolActivity: AgentToolActivity | null;
  clearTimeline: () => void;
  addUserMessage: (text: string) => void;
}) {
  const [isRequestingSession, setIsRequestingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sessionKind, setSessionKind] = useState<"text" | "voice" | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const recordedConversationRef = useRef<string | null>(null);
  const actionLockRef = useRef(false);
  const { startSession, endSession, sendUserMessage, getId } =
    useConversationControls();
  const { status, message: statusMessage } = useConversationStatus();
  const { mode } = useConversationMode();

  const recordConversation = useCallback(async () => {
    const conversationId = getId()?.trim();
    if (!conversationId || recordedConversationRef.current === conversationId) {
      return;
    }
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(siteSlug)}/agent-conversation`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId }),
          keepalive: true,
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Unable to record conversation.");
      }
      recordedConversationRef.current = conversationId;
    } catch (error) {
      recordedConversationRef.current = null;
      console.error("Unable to record public agent conversation", error);
    }
  }, [getId, siteSlug]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting" || isRequestingSession;
  const sessionBusy = isConnecting || isEndingSession;

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || !followLatestRef.current) return;
    const frame = requestAnimationFrame(() => {
      transcript.scrollTop = transcript.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [timeline]);

  const handleTranscriptScroll = useCallback(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    followLatestRef.current =
      transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <
      48;
  }, []);

  const start = useCallback(
    async (kind: "text" | "voice") => {
      if (isConnected || sessionBusy || actionLockRef.current) return;
      if (kind === "text" && !textEnabled) return;
      if (kind === "voice" && !voiceEnabled) return;

      actionLockRef.current = true;
      setSessionError(null);
      setIsRequestingSession(true);
      setSessionKind(kind);
      followLatestRef.current = true;
      recordedConversationRef.current = null;
      clearTimeline();

      try {
        const response = await fetch(
          `/api/public/${encodeURIComponent(siteSlug)}/agent-session`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mode: kind }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as
          | SessionResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "The AI concierge is unavailable right now.",
          );
        }

        const session = payload as SessionResponse;
        if (!session.signedUrl) {
          throw new Error("The AI concierge session could not be started.");
        }

        if (kind === "voice") {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        }

        // Public sessions are signed-URL only — never agent-id / API-key based.
        await startSession({
          dynamicVariables: session.dynamicVariables ?? {
            site_slug: siteSlug,
            business_name: businessName,
          },
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          textOnly: kind === "text",
          ...(session.overrides ? { overrides: session.overrides } : {}),
          onDisconnect: () => {
            void recordConversation();
          },
        });
      } catch (error) {
        const nextMessage =
          error instanceof Error
            ? error.message
            : "The AI concierge is unavailable right now.";
        setSessionError(
          kind === "voice" && /microphone|permission|audio|NotAllowed/i.test(nextMessage)
            ? "Microphone access was blocked. Allow access in your browser or start a text chat instead."
            : nextMessage,
        );
        setSessionKind(null);
      } finally {
        setIsRequestingSession(false);
        actionLockRef.current = false;
      }
    },
    [
      businessName,
      clearTimeline,
      isConnected,
      recordConversation,
      sessionBusy,
      siteSlug,
      startSession,
      textEnabled,
      voiceEnabled,
    ],
  );

  const stop = useCallback(async () => {
    if (!isConnected || isEndingSession || actionLockRef.current) return;
    actionLockRef.current = true;
    setSessionError(null);
    setIsEndingSession(true);
    try {
      await recordConversation();
      await endSession();
      setMessage("");
      setSessionKind(null);
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to end this conversation right now.",
      );
    } finally {
      setIsEndingSession(false);
      actionLockRef.current = false;
    }
  }, [endSession, isConnected, isEndingSession, recordConversation]);

  const submitMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = message.trim();
      if (!text || !isConnected || isEndingSession) return;
      followLatestRef.current = true;
      addUserMessage(text);
      try {
        await sendUserMessage(text);
      } catch (error) {
        setSessionError(
          error instanceof Error
            ? error.message
            : "Your message could not be sent. Please try again.",
        );
        return;
      }
      setMessage("");
    },
    [addUserMessage, isConnected, isEndingSession, message, sendUserMessage],
  );

  return (
    <Card
      id="assistant"
      className="h-full min-h-0 scroll-mt-24 gap-0 overflow-hidden border-foreground/10 bg-card/95 py-0 shadow-[0_35px_100px_-45px_color-mix(in_srgb,var(--foreground)_45%,transparent)] backdrop-blur-xl sm:min-h-[30rem]"
    >
      <CardHeader className="relative shrink-0 border-b bg-primary p-4 text-primary-foreground sm:p-6">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_16%_0%,white_0,transparent_38%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
              {isConnected && mode === "speaking" ? (
                <AudioLines className="size-5 animate-pulse" aria-hidden="true" />
              ) : (
                <Sparkles className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
                Available now
              </p>
              <CardTitle className="mt-1 break-words text-lg text-primary-foreground">
                {businessName} AI concierge
              </CardTitle>
              <p className="mt-1 text-xs leading-5 text-primary-foreground/70">
                {textEnabled && voiceEnabled
                  ? "Message or speak naturally—your choice."
                  : textEnabled
                    ? "Send a message and get help right away."
                    : "Speak naturally using your browser microphone."}
              </p>
            </div>
          </div>
          {isConnected ? (
            <Badge className="border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/10">
              {sessionKind === "voice" ? "Voice live" : "Chat live"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 sm:gap-4 sm:p-6">
        {timeline.length > 0 ? (
          <div
            ref={transcriptRef}
            onScroll={handleTranscriptScroll}
            className="max-h-[min(18rem,40dvh)] min-h-36 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-xl bg-muted/45 p-3 [scrollbar-gutter:stable] sm:max-h-[min(22rem,45svh)] sm:min-h-44"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversation transcript"
            tabIndex={0}
          >
            {timeline.map((item) =>
              item.kind === "tool" ? (
                <ToolCallItem key={item.id} item={item} />
              ) : (
                <div
                  key={item.id}
                  className={cn(
                    "w-fit max-w-[88%] break-words rounded-xl px-3 py-2 text-sm leading-5",
                    item.role === "user"
                      ? "ms-auto bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground shadow-sm ring-1 ring-foreground/8",
                  )}
                >
                  {item.text}
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex min-h-36 max-h-[min(18rem,40dvh)] flex-1 flex-col justify-between rounded-xl bg-muted/60 p-4 sm:max-h-[min(22rem,45svh)] sm:min-h-44 sm:p-5">
            <MessageCircle className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 break-words font-heading text-lg leading-7 tracking-tight sm:mt-6 sm:text-xl">
              {welcomeMessage ||
                `Hi! How can I help you with ${businessName} today?`}
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Ask about services, availability, policies, or help choosing the
              right next step.
            </p>
          </div>
        )}

        {toolActivity ? (
          <Alert className="border-primary/20 bg-primary/[0.055]">
            <CheckCircle2 className="text-primary" />
            <AlertTitle>{activityTitle(toolActivity.kind)}</AlertTitle>
            <AlertDescription>
              {toolActivity.offeringName} with {toolActivity.teamMemberName} ·{" "}
              {toolActivity.localTime}
              <span className="mt-1 block font-mono text-[0.7rem] font-semibold tracking-wide text-foreground">
                {toolActivity.confirmationCode}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span
              className={cn(
                "size-2 rounded-full bg-muted-foreground/40",
                isConnected && "bg-emerald-500",
                isConnecting && "animate-pulse bg-amber-500",
                status === "error" && "bg-destructive",
              )}
            />
            {isConnected
              ? sessionKind === "text"
                ? "Secure chat connected"
                : mode === "speaking"
                  ? "AI concierge is speaking"
                  : "Listening"
              : isConnecting
                ? "Connecting securely…"
                : textEnabled && voiceEnabled
                  ? "Choose text or browser audio"
                  : textEnabled
                    ? "Start a secure text chat"
                    : "Start a secure browser audio chat"}
          </div>
          <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Private session
          </span>
        </div>

        {sessionError || statusMessage ? (
          <Alert variant="destructive">
            <MessageCircle />
            <AlertDescription>{sessionError || statusMessage}</AlertDescription>
          </Alert>
        ) : null}

        {isConnected ? (
          <form onSubmit={submitMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                sessionKind === "voice"
                  ? "You can also type here…"
                  : "Type your message…"
              }
              aria-label="Message the AI concierge"
              className="h-11"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={!message.trim() || isEndingSession}
              aria-label="Send message"
            >
              <Send />
            </Button>
          </form>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              textEnabled && voiceEnabled && "sm:grid-cols-2",
            )}
          >
            {textEnabled ? (
              <Button
                type="button"
                size="lg"
                onClick={() => void start("text")}
                disabled={sessionBusy}
                className="h-12"
              >
                {isConnecting && sessionKind === "text" ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <MessageCircle data-icon="inline-start" />
                )}
                Chat with AI
              </Button>
            ) : null}
            {voiceEnabled ? (
              <Button
                type="button"
                variant={textEnabled ? "outline" : "default"}
                size="lg"
                onClick={() => void start("voice")}
                disabled={sessionBusy}
                className="h-12"
              >
                {isConnecting && sessionKind === "voice" ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Mic data-icon="inline-start" />
                )}
                Speak with AI
              </Button>
            ) : null}
          </div>
        )}

        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void stop()}
            disabled={isEndingSession}
            className="h-11 w-full"
          >
            <Square data-icon="inline-start" />
            {isEndingSession ? "Ending conversation…" : "End conversation"}
          </Button>
        ) : (
          <p className="text-center text-[0.68rem] leading-4 text-muted-foreground">
            For booking or follow-up requests, the concierge will ask for a
            contact number before continuing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentLauncher(props: AgentLauncherProps) {
  const [timeline, setTimeline] = useState<ChatTimelineItem[]>([]);
  const [toolActivity, setToolActivity] = useState<AgentToolActivity | null>(
    null,
  );
  const handleToolEvent = useCallback((event: AgentToolEvent) => {
    setTimeline((current) => {
      const index = current.findIndex(
        (item) => item.kind === "tool" && item.id === event.id,
      );
      const nextItem: ChatToolCall = { kind: "tool", ...event };
      if (index === -1) return [...current, nextItem];
      const next = [...current];
      next[index] = nextItem;
      return next;
    });
  }, []);

  const clearTimeline = useCallback(() => {
    setTimeline([]);
    setToolActivity(null);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setTimeline((current) => [
      ...current,
      {
        kind: "message",
        id: `user-local-${Date.now()}-${Math.random()}`,
        role: "user",
        text,
      },
    ]);
  }, []);

  return (
    <ConversationProvider
      onMessage={({ message, role, event_id }) => {
        const text = message.trim();
        if (!text) return;
        const id = `${role}-${event_id ?? `${Date.now()}-${Math.random()}`}`;
        setTimeline((current) => {
          const existingIndex = current.findIndex(
            (item) => item.kind === "message" && item.id === id,
          );
          if (existingIndex !== -1) {
            const existing = current[existingIndex];
            if (existing.kind === "message" && existing.text === text) {
              return current;
            }
            const next = [...current];
            next[existingIndex] = { kind: "message", id, role, text };
            return next;
          }
          const previous = current.at(-1);
          if (
            previous?.kind === "message" &&
            previous.role === role &&
            previous.text === text
          ) {
            return current;
          }
          return [
            ...current,
            {
              kind: "message",
              id,
              role,
              text,
            },
          ];
        });
      }}
    >
      <AgentClientToolRegistrar
        siteSlug={props.siteSlug}
        businessName={props.businessName}
        offerings={props.offerings}
        teamMembers={props.teamMembers}
        timezone={props.timezone}
        locale={props.locale}
        onActivity={setToolActivity}
        onToolEvent={handleToolEvent}
      />
      <AgentLauncherInner
        siteSlug={props.siteSlug}
        businessName={props.businessName}
        welcomeMessage={props.welcomeMessage}
        textEnabled={props.textEnabled}
        voiceEnabled={props.voiceEnabled}
        timeline={timeline}
        toolActivity={toolActivity}
        clearTimeline={clearTimeline}
        addUserMessage={addUserMessage}
      />
    </ConversationProvider>
  );
}
