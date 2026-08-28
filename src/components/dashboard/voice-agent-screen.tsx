"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  Mic,
  RefreshCw,
  Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Orb, type AgentState } from "@/components/ui/orb";
import {
  getCurrentDraftAction,
  listRecentConversationsAction,
  publishSiteAction,
  syncRecentConversationsAction,
  updateDraftAction,
} from "@/app/actions/dashboard";
import { useServerData } from "@/hooks/use-server-data";
import type { SiteConfig } from "@/components/dashboard/data";
import { AiAgentPlanOverlay } from "@/components/dashboard/ai-agent-plan-overlay";
import { AgentConfigureWizard } from "@/components/dashboard/agent-configure-wizard";
import { useFeatureEntitlements } from "@/components/dashboard/feature-gates";
import {
  EmptyState,
  formatDateTime,
  LoadingPanel,
  ScreenHeader,
} from "@/components/dashboard/screen-kit";
import { useWorkspace, useWorkspaceReady } from "@/components/dashboard/workspace-context";
import {
  resolveGreeting,
  type AgentConfigureDraft,
  type SessionAgentOverrides,
} from "@/lib/elevenlabs/free-plan-presets";
import { ConversationDetailDialog } from "@/components/dashboard/voice-agent-conversation-detail";

type AgentSessionResponse = {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
  overrides?: SessionAgentOverrides;
};

async function recordOperatorConversation(conversationId: string) {
  if (!conversationId) return false;
  try {
    const response = await fetch("/api/app/agent-conversation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    if (!response.ok) return false;
    return true;
  } catch {
    return false;
  }
}

function VoiceTestSession({ onClose }: { onClose: () => void }) {
  const { startSession, endSession, getId } = useConversationControls();
  const { status } = useConversationStatus();
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const connected = status === "connected";

  const stop = useCallback(async () => {
    const conversationId = getId()?.trim();
    if (conversationId) await recordOperatorConversation(conversationId);
    await endSession();
    onClose();
  }, [endSession, getId, onClose]);

  const start = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch("/api/app/agent-session", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as
        | AgentSessionResponse
        | { error?: string };
      if (!response.ok || !("signedUrl" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Could not start the test session.",
        );
      }
      await startSession({
        signedUrl: payload.signedUrl,
        dynamicVariables: payload.dynamicVariables,
        ...(payload.overrides ? { overrides: payload.overrides } : {}),
        connectionType: "websocket",
        onModeChange: ({ mode }) =>
          setAgentState(mode === "speaking" ? "talking" : "listening"),
      });
      setAgentState("listening");
    } catch (caught) {
      stream?.getTracks().forEach((track) => track.stop());
      setError(
        caught instanceof Error ? caught.message : "Microphone access required.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [startSession]);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Orb agentState={agentState} className="size-40" />
      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        {!connected ? (
          <Button onClick={() => void start()} disabled={isStarting}>
            {isStarting ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Mic data-icon="inline-start" />
            )}
            Start test
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void stop()}>
            <Square data-icon="inline-start" />
            End test
          </Button>
        )}
      </div>
    </div>
  );
}

function RecentConversations({
  organizationId,
  timezone,
  refreshKey,
}: {
  organizationId: string;
  timezone?: string;
  refreshKey: number;
}) {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const conversations = useServerData(
    () => listRecentConversationsAction({ limit: 15 }),
    [organizationId, refreshKey, open],
    { enabled: open },
  );

  async function sync() {
    setIsSyncing(true);
    try {
      await syncRecentConversationsAction();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen} className="mt-6">
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-white"
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquareText className="size-4" />
              Recent conversations
            </span>
            <ChevronDown
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 rounded-xl border border-black/10 bg-white">
          <div className="flex items-center justify-end gap-2 border-b border-black/8 px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSyncing}
              onClick={() => void sync()}
            >
              {isSyncing ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              Sync
            </Button>
          </div>
          {conversations === undefined ? (
            <LoadingPanel bare rows={3} label="Loading conversations…" />
          ) : conversations.length ? (
            <div className="divide-y divide-black/8">
              {conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => {
                    setSelectedId(conversation._id);
                    setDetailOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-black/2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {conversation.caller ?? "Unknown contact"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.summary ?? "Summary processing…"}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(conversation.startedAt, timezone)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={MessageSquareText}
              title="No conversations yet"
              description="Conversations appear after visitors use your public concierge."
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      <ConversationDetailDialog
        conversationId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

export function VoiceAgentScreen() {
  const { organization, orgSlug, isBootstrapping } = useWorkspace();
  const entitlements = useFeatureEntitlements();
  const workspaceReady = useWorkspaceReady();
  const hasAiAgent = entitlements.hasAiAgent;
  const [refreshKey, setRefreshKey] = useState(0);
  const [configureSaving, setConfigureSaving] = useState(false);
  const [configureMessage, setConfigureMessage] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const siteDraft = useServerData(
    () => getCurrentDraftAction(),
    [organization?._id, refreshKey],
    { enabled: workspaceReady },
  );

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  async function applyAgentConfigure(draft: AgentConfigureDraft) {
    if (!hasAiAgent) {
      throw new Error("Upgrade to Pro to configure the AI agent.");
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
      const published = await publishSiteAction();
      setConfigureMessage(`Published to /p/${published.siteSlug}`);
      refresh();
    } finally {
      setConfigureSaving(false);
    }
  }

  const isLoading = !entitlements.isLoaded || isBootstrapping || !workspaceReady;
  const showOverlay = entitlements.isLoaded && !hasAiAgent;

  return (
    <>
      <ScreenHeader
        title="AI Agent"
        description="Configure your concierge and publish it to your public page."
        action={
          siteDraft?.site.siteSlug ? (
            <Button asChild variant="outline" className="bg-white">
              <Link href={`/p/${siteDraft.site.siteSlug}`} target="_blank">
                Open public page <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-3xl">
        <div className={showOverlay ? "pointer-events-none select-none" : undefined}>
          {isLoading ? (
            <LoadingPanel rows={5} label="Loading agent settings…" />
          ) : !siteDraft?.site.draft ? (
            <LoadingPanel rows={4} label="Preparing your public site draft…" />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  {siteDraft.site.publishedAt ? "Published" : "Draft"}
                </Badge>
                {entitlements.browserVoice ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={() => setTestOpen(true)}
                  >
                    <Mic data-icon="inline-start" />
                    Test voice
                  </Button>
                ) : null}
              </div>

              <AgentConfigureWizard
                businessName={
                  siteDraft.site.draft.businessName ||
                  organization?.name ||
                  "our team"
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

              {configureMessage ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {configureMessage}{" "}
                  <Link
                    href={`/p/${siteDraft.site.siteSlug}`}
                    target="_blank"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    View live page
                  </Link>
                </p>
              ) : null}

              {hasAiAgent && organization?._id ? (
                <RecentConversations
                  organizationId={organization._id}
                  timezone={organization.timezone}
                  refreshKey={refreshKey}
                />
              ) : null}
            </>
          )}
        </div>

        {showOverlay ? <AiAgentPlanOverlay orgSlug={orgSlug} /> : null}
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Test your agent</DialogTitle>
            <DialogDescription>
              Start a short voice session to hear how your concierge sounds.
            </DialogDescription>
          </DialogHeader>
          {testOpen ? (
            <ConversationProvider
              onError={(error) => console.error("Web agent session error", error)}
            >
              <VoiceTestSession onClose={() => setTestOpen(false)} />
            </ConversationProvider>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
