"use client";

import { motion, useReducedMotion } from "framer-motion";

const HERO_VIDEO_SRC = "/marketing/hero-motion-graphic.mp4";

export function HeroMotionVideo() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative flex items-center order-2 lg:order-2"
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="w-full origin-center transform-3d"
        initial={
          reduceMotion ? false : { rotateY: 18, opacity: 0, scale: 0.94 }
        }
        animate={{ rotateY: 0, opacity: 1, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                rotateY: {
                  duration: 0.95,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: { duration: 0.45, ease: "easeOut", delay: 0.08 },
                scale: {
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.04,
                },
              }
        }
      >
        <div className="overflow-hidden border border-foreground/12 bg-card shadow-[18px_22px_0_0_oklch(0.205_0.018_264.4)]">
          <div className="relative aspect-video w-full bg-[#171b24]">
            <video
              className="size-full object-cover"
              autoPlay={!reduceMotion}
              loop
              muted
              playsInline
              preload={reduceMotion ? "metadata" : "auto"}
              aria-label="flippinCalendar product motion preview"
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
