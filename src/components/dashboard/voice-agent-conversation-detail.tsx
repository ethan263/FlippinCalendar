"use client";

import { Clock3, MessageSquareText } from "lucide-react";

import { getConversationDetailAction } from "@/app/actions/dashboard";
import { useServerData } from "@/hooks/use-server-data";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  formatDateTime,
  LoadingPanel,
  StatusBadge,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function ConversationDetailDialog({
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
            Conversation
          </DialogTitle>
          <DialogDescription>
            Summary and transcript from this concierge session.
          </DialogDescription>
        </DialogHeader>
        {!conversationId || detail === undefined ? (
          <LoadingPanel rows={5} label="Loading conversation…" />
        ) : !detail ? (
          <EmptyState
            compact
            icon={MessageSquareText}
            title="Conversation unavailable"
            description="This record could not be loaded."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {formatDateTime(detail.startedAt, organization?.timezone)}
              </span>
              <StatusBadge status={detail.status} />
              {detail.outcome ? (
                <Badge variant="outline" className="bg-white capitalize">
                  {detail.outcome}
                </Badge>
              ) : null}
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
                {detail.summary ?? "Summary is still processing."}
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
                  No transcript available yet.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
