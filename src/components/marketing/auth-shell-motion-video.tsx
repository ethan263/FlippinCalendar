"use client";

import { motion, useReducedMotion } from "framer-motion";
import { transitions } from "@/lib/motion/transitions";

export function AuthShellMotionVideo() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full" style={{ perspective: 1200 }}>
      <motion.div
        className="origin-left transform-3d"
        initial={
          reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { ...transitions.spring, duration: 0.85 }
        }
      >
        <div className="overflow-hidden rounded-xl border border-white/15 bg-[#0f131c] shadow-[14px_18px_0_0_rgba(0,0,0,0.35)]">
          <div className="relative aspect-video w-full">
            <video
              className="size-full object-cover"
              autoPlay={!reduceMotion}
              loop
              muted
              playsInline
              preload={reduceMotion ? "metadata" : "auto"}
              aria-label="flippinCalendar product motion preview"
            >
              <source
                src="/marketing/hero-motion-graphic.webm"
                type="video/webm"
              />
            </video>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
