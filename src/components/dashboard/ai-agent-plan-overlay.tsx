"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AiAgentPlanOverlayProps = {
  orgSlug: string;
  className?: string;
};

/** Opaque lock overlay for Core users viewing the AI Agent panel. */
export function AiAgentPlanOverlay({
  orgSlug,
  className,
}: AiAgentPlanOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/95 p-6 backdrop-blur-sm",
        className,
      )}
    >
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-black/10 bg-white text-muted-foreground shadow-sm">
          <LockKeyhole className="size-5" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight">
          Pro required
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Upgrade to Pro to configure your AI concierge, publish it on your
          public page, and review conversations.
        </p>
        <Button asChild className="mt-5">
          <Link href={`/app/${orgSlug}/billing?plan=pro&upgrade=1`}>
            Upgrade to Pro
          </Link>
        </Button>
      </div>
    </div>
  );
}
