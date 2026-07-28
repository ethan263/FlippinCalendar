"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export function FlippingWord({
  word = "flippin",
  intervalMs = 2000,
  className,
}: {
  word?: string;
  intervalMs?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const flipDuration = 0.65;
  const holdSeconds = Math.max(intervalMs / 1000 - flipDuration, 0.5);

  const faceClass = cn(
    "inline-block origin-center italic text-blue-600",
    className,
  );

  return (
    <span
      className="relative inline-grid align-baseline [perspective:900px]"
      aria-label={word}
    >
      <span
        className={cn(faceClass, "invisible col-start-1 row-start-1")}
        aria-hidden
      >
        {word}
      </span>

      {reduceMotion ? (
        <span
          className={cn(faceClass, "col-start-1 row-start-1")}
          aria-hidden="true"
        >
          {word}
        </span>
      ) : (
        <motion.span
          className="relative col-start-1 row-start-1 inline-grid transform-3d"
          style={{ transformStyle: "preserve-3d" }}
          aria-hidden="true"
          animate={{ rotateX: [0, -180, -360] }}
          transition={{
            duration: flipDuration,
            ease: [0.4, 0, 0.2, 1],
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatDelay: holdSeconds,
          }}
        >
          <span
            className={cn(faceClass, "col-start-1 row-start-1")}
            style={{ backfaceVisibility: "hidden" }}
          >
            {word}
          </span>
          <span
            className={cn(faceClass, "col-start-1 row-start-1")}
            style={{
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
            }}
          >
            {word}
          </span>
        </motion.span>
      )}
    </span>
  );
}
