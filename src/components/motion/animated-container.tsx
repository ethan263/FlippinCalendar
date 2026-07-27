"use client";

import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";

import {
  fadeIn,
  fadeInUp,
  scaleIn,
  transitions,
} from "@/lib/motion/transitions";
import { cn } from "@/lib/utils";

const animations = {
  fadeIn,
  fadeInUp,
  fadeInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  scaleIn,
  slideInLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
} satisfies Record<string, Variants>;

export type AnimatedContainerPreset = keyof typeof animations;

type AnimatedContainerProps = {
  children: ReactNode;
  animation?: AnimatedContainerPreset;
  delay?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "article";
};

export function AnimatedContainer({
  children,
  animation = "fadeInUp",
  delay = 0,
  duration = 0.45,
  className,
  as = "div",
}: AnimatedContainerProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion(as);

  return (
    <Component
      variants={animations[animation]}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      transition={
        reduceMotion
          ? { duration: 0 }
          : { ...transitions.smooth, duration, delay }
      }
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
