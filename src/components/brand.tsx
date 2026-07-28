"use client";

import Image from "next/image";
import Link from "next/link";

import { FlippingWord } from "@/components/marketing/flipping-word";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { icon: 28, flippin: "text-[1.15rem]", calendar: "text-[0.95rem]" },
  md: { icon: 32, flippin: "text-[1.45rem]", calendar: "text-[1.15rem]" },
  lg: { icon: 40, flippin: "text-[1.75rem]", calendar: "text-[1.35rem]" },
} as const;

export function Brand({
  href = "/",
  inverted = false,
  showWordmark = true,
  subtitle,
  size = "md",
  className,
  wordmarkClassName,
}: {
  href?: string;
  inverted?: boolean;
  /** When false, only the favicon mark is shown (sidebar icon mode). */
  showWordmark?: boolean;
  subtitle?: string;
  size?: keyof typeof sizeMap;
  className?: string;
  /** Extra classes on the wordmark stack (e.g. hide when sidebar collapses). */
  wordmarkClassName?: string;
}) {
  const tokens = sizeMap[size];

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="flippinCalendar home"
    >
      <span
        className="relative shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-black/10 transition-transform group-hover:-rotate-2"
        style={{ width: tokens.icon, height: tokens.icon }}
      >
        <Image
          src="/brand/flippinCalendar-icon.png"
          alt=""
          width={tokens.icon}
          height={tokens.icon}
          className="size-full object-contain p-0.5"
          priority
        />
      </span>

      {showWordmark ? (
        <span
          data-brand-wordmark
          className={cn("min-w-0", wordmarkClassName)}
        >
          <span className="inline-flex items-baseline font-heading font-semibold tracking-[-0.035em] leading-none">
            <FlippingWord
              word="flippin"
              intervalMs={2400}
              className={cn(
                tokens.flippin,
                "not-italic font-semibold",
                inverted ? "text-[#7EB6FF]" : "text-[#1D4ED8]",
              )}
            />
            <span
              className={cn(
                tokens.calendar,
                "ml-0.5 font-semibold",
                inverted ? "text-white" : "text-neutral-950",
              )}
            >
              Calendar
            </span>
          </span>
          {subtitle ? (
            <span
              className={cn(
                "mt-1 block text-[9px] font-semibold tracking-[0.18em] uppercase",
                inverted ? "text-white/45" : "text-sidebar-foreground/45",
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
