"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { transitions } from "@/lib/motion/transitions";

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : transitions.snappy}
    >
      {children}
    </motion.div>
  );
}
