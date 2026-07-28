"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChartColumn,
  Clock3,
  Headphones,
  LoaderCircle,
  MessageSquareText,
  Mic,
  Radio,
  RefreshCw,
  Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Orb, type AgentState } from "@/components/ui/orb";
import {
  getConversationAnalyticsAction,
  getConversationDetailAction,
  getCurrentAgentAction,
  getCurrentDraftAction,
  listRecentConversationsAction,
  publishSiteAction,
  syncRecentConversationsAction,
  updateDraftAction,
} from "@/app/actions/dashboard";
import { useServerData } from "@/hooks/use-server-data";
import type { Conversation, SiteConfig } from "@/components/dashboard/data";
import {
  AiAgentPlanLock,
  FeatureEntitlementCard,
  useFeatureEntitlements,
} from "@/components/dashboard/feature-gates";
import {
  EmptyState,
  formatDateTime,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import {
  resolveGreeting,
  type AgentConfigureDraft,
} from "@/lib/elevenlabs/free-plan-presets";
import { AgentConfigureWizard } from "@/components/dashboard/agent-configure-wizard";

type AgentSessionResponse = {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
  overrides?: {
    agent?: { firstMessage?: string; language?: string };
    tts?: { voiceId?: string };
    turn?: { turnEagerness?: "patient" | "normal" | "eager" };
  };
};

async function recordOperatorConversation(conversationId: string) {
  if (!conversationId) return false;
  try {
    const response = await fetch("/api/app/agent-conversation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error || "Conversation record request failed.");
    }
    return true;
  } catch (error) {
    console.error("Unable to record operator conversation", error);
    return false;
  }
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function WebAgentSession({ onRecorded }: { onRecorded?: () => void }) {
  const { terminology } = useWorkspace();
  const { startSession, endSession, getId } = useConversationControls();
  const { status } = useConversationStatus();
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedRef = useRef<string | null>(null);
  const actionLockRef = useRef(false);
  const connected = status === "connected";
  const isConnecting = status === "connecting" || isStarting;
  const isBusy = isConnecting || isStopping;

  const persistConversation = useCallback(async () => {
    const conversationId = getId()?.trim();
    if (!conversationId || recordedRef.current === conversationId) return;
    const recorded = await recordOperatorConversation(conversationId);
    if (recorded) {
      recordedRef.current = conversationId;
      onRecorded?.();
    } else {
      setError("Conversation ended, but the record is still syncing. Refresh shortly.");
    }
  }, [getId, onRecorded]);

  const stop = useCallback(async () => {
    if (!connected || isStopping || actionLockRef.current) return;
    actionLockRef.current = true;
    setIsStopping(true);
    try {
      await persistConversation();
      await endSession();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to end the current voice test right now.",
      );
    } finally {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setAgentState(null);
      setIsStopping(false);
      actionLockRef.current = false;
    }
  }, [connected, endSession, isStopping, persistConversation]);

  const start = useCallback(async () => {
    if (connected || isBusy || actionLockRef.current) return;
    actionLockRef.current = true;
    setError(null);
    setIsStarting(true);
    recordedRef.current = null;
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch("/api/app/agent-session", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as
        | AgentSessionResponse
        | { error?: string };
      if (!response.ok || !("signedUrl" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The agent test could not be started.",
        );
      }
      await startSession({
        signedUrl: payload.signedUrl,
        dynamicVariables: payload.dynamicVariables,
        ...(payload.overrides ? { overrides: payload.overrides } : {}),
        connectionType: "websocket",
        onModeChange: ({ mode }) =>
          setAgentState(mode === "speaking" ? "talking" : "listening"),
        onDisconnect: () => {
          void persistConversation();
        },
      });
      setAgentState("listening");
    } catch (caught) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setAgentState(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Microphone access is required to start a web conversation.",
      );
    } finally {
      setIsStarting(false);
      actionLockRef.current = false;
    }
  }, [connected, isBusy, persistConversation, startSession]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
      <div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-white/15 bg-white/5 text-white"
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Web agent ready
          </Badge>
          {connected && (
            <Badge className="animate-pulse bg-primary text-primary-foreground hover:bg-primary/85">
              Live
            </Badge>
          )}
        </div>
        <h2 className="mt-5 max-w-lg font-heading text-3xl leading-none font-semibold tracking-[-0.035em]">
          Talk to the same agent your visitors meet.
        </h2>
        <p className="mt-3 max-w-lg text-xs leading-5 text-white/55">
          This live browser check uses the organization’s current ElevenLabs agent.
          Test the greeting, knowledge, and {terminology.booking.toLowerCase()} flow
          before sharing the public page.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {connected ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void stop()}
              disabled={isStopping}
            >
              <Square /> {isStopping ? "Ending…" : "End test"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void start()}
              disabled={isBusy}
              className="bg-primary text-primary-foreground hover:bg-primary/85"
            >
              <Mic /> {isConnecting ? "Connecting…" : "Start voice test"}
            </Button>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
            <Headphones className="size-3.5" /> Headphones recommended
          </span>
        </div>
        {error && <p className="mt-3 text-xs leading-5 text-rose-300">{error}</p>}
      </div>

      <div className="mx-auto size-52 max-w-full">
        <Orb
          agentState={agentState}
          colors={["#3156d9", "#9fb0ff"]}
          className="size-full"
        />
      </div>
    </div>
  );
}

function WebAgentConsole({ onRecorded }: { onRecorded?: () => void }) {
  return (
    <ConversationProvider
      onError={(error) => console.error("Web agent session error", error)}
    >
      <WebAgentSession onRecorded={onRecorded} />
    </ConversationProvider>
  );
}

function ConversationDetailDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organization } = useWorkspace();
  const detail = useServerData(
    () =>
      conversationId
        ? getConversationDetailAction(conversationId)
        : Promise.resolve(null),
    [conversationId],
    { enabled: open && Boolean(conversationId) },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-tight">
            Conversation detail
          </DialogTitle>
          <DialogDescription>
            Transcript and summary captured for this flippinCalendar concierge session.
          </DialogDescription>
        </DialogHeader>
        {!conversationId || detail === undefined ? (
          <LoadingPanel rows={5} />
        ) : !detail ? (
          <EmptyState
            compact
            icon={MessageSquareText}
            title="Conversation unavailable"
            description="This record could not be loaded for the current organization."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {formatDateTime(detail.startedAt, organization?.timezone)}
              </span>
              <StatusBadge status={detail.status} />
              {detail.outcome && (
                <Badge variant="outline" className="bg-white capitalize">
                  {detail.outcome}
                </Badge>
              )}
              <span className="inline-flex items-center gap-1 font-mono">
                <Clock3 className="size-3" />
                {formatDuration(detail.durationSeconds)}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Summary
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/85">
                {detail.summary ??
                  "Summary is still processing in ElevenLabs. Open this conversation again in a moment."}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Transcript
              </p>
              {detail.transcript ? (
                <pre className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-black/8 bg-[#f7f6f3] p-4 font-sans text-xs leading-6 whitespace-pre-wrap text-foreground/80">
                  {detail.transcript}
                </pre>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  No transcript is available yet. Short or interrupted sessions may not produce one.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VoiceAgentScreen() {
  const { organization, orgSlug, isBootstrapping } = useWorkspace();
  const entitlements = useFeatureEntitlements();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const workspaceReady = Boolean(organization?._id) && !isBootstrapping;

  const agent = useServerData(
    () => getCurrentAgentAction(),
    [organization?._id],
    { enabled: workspaceReady },
  );
  const analytics = useServerData(
    () => getConversationAnalyticsAction(),
    [organization?._id, refreshKey],
    { enabled: workspaceReady },
  );
  const conversations = useServerData(
    () => listRecentConversationsAction({ limit: 50 }),
    [organization?._id, refreshKey],
    { enabled: workspaceReady },
  );

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const syncConversations = useCallback(async () => {
    if (!workspaceReady || isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncRecentConversationsAction();
      refresh();
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Unable to sync conversations right now.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refresh, workspaceReady]);

  // Background enrich once entitled — skip on Core (no AI Agent).
  useEffect(() => {
    if (!workspaceReady || !entitlements.hasAiAgent) return;
    let cancelled = false;
    void Promise.resolve(syncRecentConversationsAction())
      .then(() => {
        if (!cancelled) refresh();
      })
      .catch(() => {
        // Best-effort; explicit Sync button surfaces failures.
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceReady, entitlements.hasAiAgent, refresh]);

  const [configureSaving, setConfigureSaving] = useState(false);
  const [configureMessage, setConfigureMessage] = useState<string | null>(null);
  const siteDraft = useServerData(
    () => getCurrentDraftAction(),
    [organization?._id, refreshKey],
    { enabled: workspaceReady },
  );

  async function applyAgentConfigure(draft: AgentConfigureDraft) {
    if (!entitlements.hasAiAgent) {
      throw new Error("AI Agent requires a Pro or Voice plan.");
    }
    if (!siteDraft?.site.draft) {
      throw new Error("Public site draft is not ready yet.");
    }
    setConfigureSaving(true);
    setConfigureMessage(null);
    try {
      const businessName =
        siteDraft.site.draft.businessName || organization?.name || "our team";
      const showWebChat =
        (draft.surface === "chat" || draft.surface === "both") &&
        entitlements.webAgent;
      const showVoiceChat =
        (draft.surface === "voice" || draft.surface === "both") &&
        entitlements.browserVoice;
      const next: SiteConfig = {
        ...siteDraft.site.draft,
        agent: {
          ...siteDraft.site.draft.agent,
          showWebChat,
          showVoiceChat,
          welcomeMessage: resolveGreeting(draft, businessName),
          persona: draft.persona,
          voicePreset: draft.voice,
          turnEagerness: draft.pace,
          language: draft.language,
        },
      };
      await updateDraftAction({ config: next });
      await publishSiteAction();
      setConfigureMessage(
        "Saved and published. The Orb on your public card uses these settings.",
      );
      refresh();
    } finally {
      setConfigureSaving(false);
    }
  }

  function openConversation(conversation: Conversation) {
    setSelectedId(conversation._id);
    setDetailOpen(true);
  }

  const aiLocked = entitlements.isLoaded && !entitlements.hasAiAgent;
  const aiChecking = !entitlements.isLoaded;

  return (
    <>
      <ScreenHeader
        eyebrow="AI channel control"
        title="AI Agent"
        description={
          aiLocked
            ? "AI Agent is included on Pro and Voice — not on Core."
            : "Configure your concierge with simple presets, then test and review conversations."
        }
        action={
          aiLocked ? (
            <Button asChild className="bg-primary text-primary-foreground">
              <Link href={`/app/${orgSlug}/billing`}>
                Compare plans <ArrowUpRight />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="bg-white">
              <Link href={`/app/${orgSlug}/public-site`}>
                Public experience <ArrowUpRight />
              </Link>
            </Button>
          )
        }
      />

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <FeatureEntitlementCard feature="web_agent" />
        <FeatureEntitlementCard feature="browser_voice" />
      </div>

      {aiChecking ? (
        <Card className="mt-6 bg-white">
          <CardContent className="grid min-h-48 place-items-center py-10 text-center text-sm text-muted-foreground">
            <div>
              <Activity className="mx-auto mb-3 size-5 animate-pulse text-primary" />
              Checking organization plan…
            </div>
          </CardContent>
        </Card>
      ) : aiLocked ? (
        <AiAgentPlanLock orgSlug={orgSlug} className="mt-6" />
      ) : (
        <>
      <section className="mt-6">
        {!workspaceReady || !siteDraft?.site.draft ? (
          <div className="rounded-2xl border border-black/10 bg-white px-5 py-10 text-center text-sm text-muted-foreground">
            Preparing agent configure wizard…
          </div>
        ) : (
          <AgentConfigureWizard
            businessName={
              siteDraft.site.draft.businessName || organization?.name || "our team"
            }
            entitlements={entitlements}
            saving={configureSaving}
            initial={{
              persona: siteDraft.site.draft.agent.persona,
              voice: siteDraft.site.draft.agent.voicePreset,
              pace: siteDraft.site.draft.agent.turnEagerness,
              language: siteDraft.site.draft.agent.language,
              surface: siteDraft.site.draft.agent.showVoiceChat
                ? siteDraft.site.draft.agent.showWebChat
                  ? "both"
                  : "voice"
                : "chat",
            }}
            onApply={applyAgentConfigure}
          />
        )}
        {configureMessage ? (
          <p className="mt-3 text-xs text-muted-foreground">{configureMessage}</p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="bg-[#20201e] text-white ring-black/15">
          <CardContent className="pt-0">
            {!agent || !entitlements.isLoaded || !workspaceReady ? (
              <div className="grid min-h-80 place-items-center text-xs text-white/45">
                <div className="text-center">
                  <Activity className="mx-auto mb-3 size-5 animate-pulse text-primary" />
                  {!workspaceReady
                    ? "Preparing workspace…"
                    : !entitlements.isLoaded
                      ? "Checking organization plan…"
                      : "Loading agent configuration…"}
                </div>
              </div>
            ) : entitlements.browserVoice && agent.integration?.webEnabled ? (
              <WebAgentConsole onRecorded={refresh} />
            ) : (
              <div className="grid min-h-80 place-items-center px-5 py-10 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 bg-white/5">
                    <Bot className="size-5 text-primary" />
                  </span>
                  <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                    {agent.integration?.webEnabled
                      ? "Unlock browser conversations"
                      : "Agent setup in progress"}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-white/50">
                    {agent.integration?.webEnabled
                      ? "Add browser audio to test the live microphone experience. Text chat can still run independently on the public page."
                      : "Connect an ElevenLabs agent to this organization before starting a live test."}
                  </p>
                  <Button asChild className="mt-5 bg-primary text-primary-foreground hover:bg-primary/85">
                    <Link
                      href={
                        agent.integration?.webEnabled
                          ? `/app/${orgSlug}/billing`
                          : `/app/${orgSlug}/settings`
                      }
                    >
                      {agent.integration?.webEnabled
                        ? "Compare plans"
                        : "Open settings"}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="border-b border-black/8 pb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Current agent
                </p>
                <CardTitle className="mt-1 font-heading text-xl tracking-tight">
                  flippinCalendar concierge
                </CardTitle>
              </div>
              <CardAction>
                <Radio className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  status={
                    agent?.integration?.webEnabled ? "active" : "draft"
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Public modes</span>
                <span className="font-medium">Text + browser audio</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  First message
                </p>
                <CardTitle className="sr-only">Agent opening line</CardTitle>
              </div>
              <CardAction>
                <MessageSquareText className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <blockquote className="font-heading text-lg leading-7 tracking-tight text-foreground/80">
                “Hello, welcome to {organization?.name ?? "our team"}. How can I help today?”
              </blockquote>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Last 7 days",
            value: analytics?.last7Days,
            note: "Sessions recorded",
          },
          {
            label: "Last 30 days",
            value: analytics?.last30Days,
            note: analytics?.last30DaysIsCapped ? "Capped at 500" : "Sessions recorded",
          },
          {
            label: "Avg duration",
            value:
              analytics == null
                ? undefined
                : formatDuration(analytics.averageDurationSeconds),
            note: "When duration is available",
          },
          {
            label: "Top outcome",
            value:
              analytics == null
                ? undefined
                : analytics.outcomes[0]
                  ? `${analytics.outcomes[0].outcome} (${analytics.outcomes[0].count})`
                  : "—",
            note: "From stored outcomes",
          },
        ].map((metric, index) => (
          <div key={metric.label} className="bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                0{index + 1}
              </span>
              <ChartColumn className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-7 font-heading text-3xl font-semibold tracking-tighter tabular-nums capitalize">
              {metric.value === undefined ? "…" : metric.value}
            </p>
            <p className="mt-2 text-xs font-semibold">{metric.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.note}</p>
          </div>
        ))}
      </section>

      {analytics && analytics.outcomes.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {analytics.outcomes.slice(0, 6).map((entry) => (
            <Badge key={entry.outcome} variant="outline" className="bg-white capitalize">
              {entry.outcome}: {entry.count}
            </Badge>
          ))}
        </div>
      )}

      <Card className="mt-6 bg-white">
        <CardHeader className="border-b border-black/8 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Conversation log
            </p>
            <CardTitle className="mt-1 font-heading text-xl tracking-tight">
              Recent conversations
            </CardTitle>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                disabled={!workspaceReady || isSyncing}
                onClick={() => void syncConversations()}
              >
                {isSyncing ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {isSyncing ? "Syncing…" : "Sync"}
              </Button>
              <Badge variant="outline" className="bg-white font-mono text-[10px]">
                Workspace records
              </Badge>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {syncError ? (
            <p className="mb-3 text-xs text-destructive">{syncError}</p>
          ) : null}
          {!workspaceReady || conversations === undefined ? (
            <LoadingPanel rows={4} />
          ) : conversations.length ? (
            <div className="divide-y divide-black/8">
              {conversations.map((conversation) => {
                const createdAt = conversation.startedAt;
                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => openConversation(conversation)}
                    className="grid w-full gap-3 py-4 text-left transition-colors hover:bg-black/2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-mono text-[11px] font-medium">
                        {formatDateTime(createdAt, organization?.timezone)}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                        <MessageSquareText className="size-3" />
                        Web
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {conversation.caller ?? "Unknown contact"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {conversation.summary ??
                          "Conversation captured; summary is still processing."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {conversation.durationSeconds !== undefined && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <Clock3 className="size-3" />
                          {formatDuration(conversation.durationSeconds)}
                        </span>
                      )}
                      <StatusBadge status={conversation.status ?? "completed"} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              icon={MessageSquareText}
              title="No conversations yet"
              description="End a voice test here or a public concierge session to store the conversation id. Summaries appear after ElevenLabs finishes processing."
            />
          )}
        </CardContent>
      </Card>

      <ConversationDetailDialog
        conversationId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
        </>
      )}
    </>
  );
}
