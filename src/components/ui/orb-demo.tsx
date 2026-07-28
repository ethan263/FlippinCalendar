"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AgentState, Orb } from "@/components/ui/orb";
import { cn } from "@/lib/utils";

const DEFAULT_ORBS: [string, string][] = [
  ["#CADCFC", "#A0B9D1"],
  ["#F6E7D8", "#E0CFC2"],
  ["#E5E7EB", "#9CA3AF"],
];

type OrbDemoProps = {
  small?: boolean;
  colors?: [string, string];
  className?: string;
  /** Controlled agent state from a live session (overrides local demo buttons). */
  agentState?: AgentState;
  /** Hide Idle/Listening/Talking controls when driven by a live session. */
  hideControls?: boolean;
  title?: string;
  description?: string;
};

/**
 * ElevenLabs-style Orb preview used on the AI Agents dashboard and as the
 * public-card concierge affordance when chat/voice is enabled.
 */
export function OrbDemo({
  small = false,
  colors,
  className,
  agentState: controlledState,
  hideControls = false,
  title = "Agent Orbs",
  description = "Interactive orb visualization with agent states",
}: OrbDemoProps) {
  const [localAgent, setLocalAgent] = useState<AgentState>(null);
  const agent = controlledState !== undefined ? controlledState : localAgent;
  const palette = colors
    ? [colors]
    : small
      ? [DEFAULT_ORBS[0]]
      : DEFAULT_ORBS;

  return (
    <div className={cn("bg-card w-full rounded-lg border p-6", className)}>
      {(title || description) && (
        <div className="mb-4">
          {title ? (
            <h3 className="text-lg font-semibold">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-center gap-8">
          {palette.map((orbColors, index) => (
            <div
              key={`${orbColors[0]}-${index}`}
              className={cn(
                "relative",
                !small && index !== 0 && "hidden md:block",
              )}
            >
              <div className="bg-muted relative h-32 w-32 rounded-full p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_12px_rgba(0,0,0,0.3)]">
                  <Orb
                    colors={orbColors}
                    seed={(index + 1) * 1000}
                    agentState={agent}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!hideControls && controlledState === undefined ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocalAgent(null)}
              disabled={agent === null}
            >
              Idle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocalAgent("listening")}
              disabled={agent === "listening"}
            >
              Listening
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={agent === "talking"}
              onClick={() => setLocalAgent("talking")}
            >
              Talking
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ConciergeOrbButtonProps = {
  colors?: [string, string];
  agentState?: AgentState;
  onClick?: () => void;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  className?: string;
};

/** Compact circular Orb used as the public-card AI launcher. */
export function ConciergeOrbButton({
  colors = ["#CADCFC", "#A0B9D1"],
  agentState = null,
  onClick,
  className,
  ...aria
}: ConciergeOrbButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full p-0.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/30 transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        className,
      )}
      {...aria}
    >
      <span className="bg-background relative size-full overflow-hidden rounded-full">
        <Orb colors={colors} agentState={agentState} seed={2400} />
      </span>
    </button>
  );
}
