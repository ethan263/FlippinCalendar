"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AudioLines,
  ArrowUpRight,
  Bot,
  Check,
  LineChart,
  LockKeyhole,
} from "lucide-react";

import { fetchEntitlementsAction } from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BillingPlanKey } from "@/lib/billing/features";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export type ProductFeature = "web_agent" | "browser_voice" | "advanced_analytics";

export type EntitlementsState = {
  isLoaded: boolean;
  plan: BillingPlanKey;
  pendingPlan: BillingPlanKey | null;
  webAgent: boolean;
  browserVoice: boolean;
  advancedAnalytics: boolean;
  hasAiAgent: boolean;
};

const defaultEntitlements: EntitlementsState = {
  isLoaded: false,
  plan: "core",
  pendingPlan: null,
  webAgent: false,
  browserVoice: false,
  advancedAnalytics: false,
  hasAiAgent: false,
};

type EntitlementsContextValue = {
  entitlements: EntitlementsState;
  refreshEntitlements: () => Promise<EntitlementsState>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

const featureCopy = {
  web_agent: {
    title: "Text chat",
    icon: Bot,
  },
  browser_voice: {
    title: "Voice",
    icon: AudioLines,
  },
  advanced_analytics: {
    title: "Analytics",
    icon: LineChart,
  },
} satisfies Record<
  ProductFeature,
  { title: string; icon: typeof Bot }
>;

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { organization, orgSlug } = useWorkspace();
  const [entitlements, setEntitlements] =
    useState<EntitlementsState>(defaultEntitlements);

  const refreshEntitlements = useCallback(async () => {
    if (!organization?._id) {
      const empty = { ...defaultEntitlements, isLoaded: true };
      setEntitlements(empty);
      return empty;
    }

    try {
      const next = await fetchEntitlementsAction(orgSlug);
      setEntitlements(next);
      return next;
    } catch {
      const fallback = { ...defaultEntitlements, isLoaded: true };
      setEntitlements((current) =>
        current.isLoaded ? current : fallback,
      );
      return fallback;
    }
  }, [organization?._id, orgSlug]);

  useEffect(() => {
    if (!organization?._id) {
      setEntitlements({ ...defaultEntitlements, isLoaded: true });
      return;
    }

    let cancelled = false;
    void fetchEntitlementsAction(orgSlug)
      .then((next) => {
        if (!cancelled) setEntitlements(next);
      })
      .catch(() => {
        if (!cancelled) {
          setEntitlements((current) => ({ ...current, isLoaded: true }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organization?._id, orgSlug]);

  const value = useMemo(
    () => ({ entitlements, refreshEntitlements }),
    [entitlements, refreshEntitlements],
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

function useEntitlementsContext() {
  const value = useContext(EntitlementsContext);
  if (!value) {
    throw new Error(
      "useFeatureEntitlements must be used inside EntitlementsProvider",
    );
  }
  return value;
}

export function useFeatureEntitlements() {
  return useEntitlementsContext().entitlements;
}

export function useRefreshEntitlements() {
  return useEntitlementsContext().refreshEntitlements;
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
  const { isLoaded, webAgent, browserVoice, advancedAnalytics } =
    useFeatureEntitlements();
  const entitled =
    feature === "web_agent"
      ? webAgent
      : feature === "browser_voice"
        ? browserVoice
        : advancedAnalytics;
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
