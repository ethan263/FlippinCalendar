"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";

import { transitions } from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

/** `1` = continue / submit forward, `-1` = back */
export type StackDirection = 1 | -1;

const stackVariants: Variants = {
  enter: (direction: StackDirection) =>
    direction > 0
      ? { opacity: 0, y: 42, scale: 1.03, filter: "blur(0px)" }
      : { opacity: 0, y: -28, scale: 0.9, filter: "blur(2px)" },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: StackDirection) =>
    direction > 0
      ? // Fade back into the stack behind the next card
        { opacity: 0, y: -36, scale: 0.88, filter: "blur(3px)" }
      : { opacity: 0, y: 48, scale: 1.02, filter: "blur(0px)" },
};

type StackedFlowCardsProps = {
  stepKey: string;
  direction?: StackDirection;
  children: ReactNode;
  className?: string;
  /** Decorative depth layers behind the active card */
  depth?: 0 | 1 | 2 | 3;
};

/**
 * Step/content cards that stack behind as the user continues or submits.
 * Forward exits shrink + fade upward (into the deck); the next card rises in front.
 */
export function StackedFlowCards({
  stepKey,
  direction = 1,
  children,
  className,
  depth = 2,
}: StackedFlowCardsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative", className)}>
      {!reduceMotion && depth > 0
        ? Array.from({ length: depth }, (_, index) => (
            <div
              key={`stack-depth-${index}`}
              aria-hidden
              className="pointer-events-none absolute inset-x-3 rounded-[1.25rem] border border-foreground/6 bg-background/55 shadow-[0_12px_40px_-28px_rgba(20,16,12,0.45)]"
              style={{
                top: -(index + 1) * 7,
                bottom: (index + 1) * 5,
                zIndex: 0,
                opacity: 0.42 - index * 0.12,
                transform: `scale(${1 - (index + 1) * 0.028})`,
              }}
            />
          ))
        : null}

      <div className="relative z-[1] grid">
        <AnimatePresence mode="sync" custom={direction} initial={false}>
          <motion.div
            key={stepKey}
            custom={direction}
            variants={stackVariants}
            initial={reduceMotion ? false : "enter"}
            animate="center"
            exit={reduceMotion ? undefined : "exit"}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    ...transitions.page,
                    duration: 0.42,
                    opacity: { duration: 0.32 },
                  }
            }
            className="col-start-1 row-start-1 w-full"
            style={{ transformOrigin: "50% 20%" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
