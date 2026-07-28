"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  AudioLines,
  ArrowUpRight,
  Bot,
  Check,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export type ProductFeature = "web_agent" | "browser_voice";

const featureCopy = {
  web_agent: {
    title: "AI text chat",
    description:
      "Let visitors message your ElevenLabs concierge from the public page.",
    icon: Bot,
    capability: "Secure live text chat",
  },
  browser_voice: {
    title: "Browser audio",
    description:
      "Let visitors speak naturally to the same concierge using their microphone.",
    icon: AudioLines,
    capability: "Live microphone conversations",
  },
} satisfies Record<
  ProductFeature,
  { title: string; description: string; icon: typeof Bot; capability: string }
>;

export function useFeatureEntitlements() {
  const { has, isLoaded } = useAuth();
  const webAgent = Boolean(has?.({ feature: "web_agent" }));
  const browserVoice = Boolean(has?.({ feature: "browser_voice" }));
  return {
    isLoaded,
    webAgent,
    browserVoice,
    /** Pro (`web_agent`) or Voice (`browser_voice`). Core / free_org has neither. */
    hasAiAgent: webAgent || browserVoice,
  };
}

/** Full-page lock when Core (free) tries to open AI Agent. */
export function AiAgentPlanLock({
  orgSlug,
  className,
}: {
  orgSlug: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed bg-[#f7f5ef]", className)}>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
        <span className="grid size-12 place-items-center rounded-full border border-black/10 bg-white text-muted-foreground">
          <LockKeyhole className="size-5" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          AI Agent is on Pro and Voice
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Core includes bookings and your public page. Upgrade to Pro for the
          ElevenLabs web concierge, or Voice for browser audio conversations.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/app/${orgSlug}/billing`}>
            Compare plans <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeatureEntitlementCard({
  feature,
  compact = false,
}: {
  feature: ProductFeature;
  compact?: boolean;
}) {
  const { has, isLoaded } = useAuth();
  const { orgSlug } = useWorkspace();
  const entitled = Boolean(has?.({ feature }));
  const copy = featureCopy[feature];
  const Icon = copy.icon;

  return (
    <Card
      className={cn(
        "relative bg-white",
        !entitled && isLoaded && "border-dashed bg-[#f7f5ef]",
        compact && "gap-3 py-3",
      )}
    >
      <CardHeader className={cn("gap-3", compact && "px-3") }>
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-lg border",
              entitled
                ? "border-primary/20 bg-primary/5 text-primary"
                : "border-black/10 bg-white text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
          {!isLoaded ? (
            <Badge variant="outline">Checking…</Badge>
          ) : entitled ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <Check className="size-3" /> Included
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-white text-muted-foreground">
              <LockKeyhole className="size-3" /> Upgrade
            </Badge>
          )}
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold tracking-tight">
            {copy.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent>
          <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" />
              {copy.capability}
            </span>
            {!entitled && isLoaded && (
              <Button asChild variant="outline" size="sm" className="bg-white">
                <Link href={`/app/${orgSlug}/billing`}>
                  Compare plans <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
