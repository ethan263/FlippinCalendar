"use client";

import { useEffect, useState } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  getCurrentAgentAction,
  getCurrentDraftAction,
  updateAgentWorkspaceSettingsAction,
} from "@/app/actions/dashboard";
import { useFeatureEntitlements } from "@/components/dashboard/feature-gates";
import { LoadingPanel } from "@/components/dashboard/screen-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerData } from "@/hooks/use-server-data";

type AgentWorkspaceSettingsProps = {
  organizationId: string;
};

export function AgentWorkspaceSettings({
  organizationId,
}: AgentWorkspaceSettingsProps) {
  const entitlements = useFeatureEntitlements();
  const agent = useServerData(() => getCurrentAgentAction(), [organizationId]);
  const siteDraft = useServerData(
    () => getCurrentDraftAction(),
    [organizationId],
  );

  const [webEnabled, setWebEnabled] = useState(false);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
  const [showWebChat, setShowWebChat] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agent?.integration) return;
    setWebEnabled(agent.integration.webEnabled);
    setKnowledgeBaseId(agent.integration.knowledgeBaseId ?? "");
  }, [agent?.integration]);

  useEffect(() => {
    if (!siteDraft?.site.draft) return;
    setShowWebChat(siteDraft.site.draft.agent.showWebChat);
    setShowVoiceChat(siteDraft.site.draft.agent.showVoiceChat);
  }, [siteDraft?.site.draft]);

  async function persist(patch: {
    webEnabled?: boolean;
    knowledgeBaseId?: string | null;
    showWebChat?: boolean;
    showVoiceChat?: boolean;
  }) {
    setSaving(true);
    try {
      await updateAgentWorkspaceSettingsAction(patch);
      toast.success("Agent settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save agent settings.",
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  if (!agent || !siteDraft?.site.draft) {
    return <LoadingPanel rows={4} label="Loading agent controls…" />;
  }

  return (
    <Card className="bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <CardTitle className="font-heading text-xl tracking-tight">
            AI concierge
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="agent-enabled">Enable concierge integration</Label>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Master switch for ElevenLabs on this workspace.
            </p>
          </div>
          <Switch
            id="agent-enabled"
            checked={webEnabled}
            disabled={saving}
            onCheckedChange={(next) => {
              setWebEnabled(next);
              void persist({ webEnabled: next }).catch(() => {
                setWebEnabled(!next);
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="knowledge-base-id">Knowledge base ID</Label>
          <Input
            id="knowledge-base-id"
            value={knowledgeBaseId}
            placeholder="Optional ElevenLabs knowledge base"
            disabled={saving}
            onChange={(event) => setKnowledgeBaseId(event.target.value)}
            onBlur={() => {
              const trimmed = knowledgeBaseId.trim();
              const current = agent.integration?.knowledgeBaseId ?? "";
              if (trimmed === current) return;
              void persist({ knowledgeBaseId: trimmed.length ? trimmed : null }).catch(
                () => setKnowledgeBaseId(current),
              );
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-4">
          <div>
            <Label htmlFor="settings-web-chat">Web text chat</Label>
            {!entitlements.isLoaded ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Checking plan…
              </p>
            ) : !entitlements.webAgent ? (
              <p className="mt-0.5 text-[10px] text-primary">
                Requires Engage or Voice
              </p>
            ) : null}
          </div>
          <Switch
            id="settings-web-chat"
            checked={showWebChat}
            disabled={
              saving ||
              !webEnabled ||
              !entitlements.isLoaded ||
              (!entitlements.webAgent && !showWebChat)
            }
            onCheckedChange={(next) => {
              setShowWebChat(next);
              void persist({ showWebChat: next }).catch(() => {
                setShowWebChat(!next);
              });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="settings-voice-chat">Browser voice</Label>
            {!entitlements.isLoaded ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Checking plan…
              </p>
            ) : !entitlements.browserVoice ? (
              <p className="mt-0.5 text-[10px] text-primary">
                Requires Voice plan
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Visitor microphone audio on the public page.
              </p>
            )}
          </div>
          <Switch
            id="settings-voice-chat"
            checked={showVoiceChat}
            disabled={
              saving ||
              !webEnabled ||
              !entitlements.isLoaded ||
              (!entitlements.browserVoice && !showVoiceChat)
            }
            onCheckedChange={(next) => {
              setShowVoiceChat(next);
              void persist({ showVoiceChat: next }).catch(() => {
                setShowVoiceChat(!next);
              });
            }}
          />
        </div>

        {saving ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" />
            Saving…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
