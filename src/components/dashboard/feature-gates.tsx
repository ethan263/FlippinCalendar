"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AudioLines,
  ArrowUpRight,
  Bot,
  Check,
  LockKeyhole,
} from "lucide-react";

import { fetchEntitlementsAction } from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export type ProductFeature = "web_agent" | "browser_voice";

const featureCopy = {
  web_agent: {
    title: "Text chat",
    icon: Bot,
  },
  browser_voice: {
    title: "Voice",
    icon: AudioLines,
  },
} satisfies Record<
  ProductFeature,
  { title: string; icon: typeof Bot }
>;

export function useFeatureEntitlements() {
  const { organization } = useWorkspace();
  const [state, setState] = useState({
    isLoaded: false,
    webAgent: false,
    browserVoice: false,
    hasAiAgent: false,
  });

  useEffect(() => {
    if (!organization?._id) return;

    let cancelled = false;
    void fetchEntitlementsAction()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setState((current) => ({ ...current, isLoaded: true }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organization?._id]);

  return state;
}

/** Full-page lock when Core tries to open AI Agent. */
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
          Upgrade required
        </h2>
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
  const { orgSlug } = useWorkspace();
  const { isLoaded, webAgent, browserVoice } = useFeatureEntitlements();
  const entitled = feature === "web_agent" ? webAgent : browserVoice;
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
      <CardHeader className={cn("gap-3", compact && "px-3")}>
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
        </div>
      </CardHeader>
      {!compact && !entitled && isLoaded && (
        <CardContent>
          <Button asChild variant="outline" size="sm" className="w-full bg-white">
            <Link href={`/app/${orgSlug}/billing`}>
              Compare plans <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
