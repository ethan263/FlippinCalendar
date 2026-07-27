"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MessageSquareText,
  Mic,
  MoveUpRight,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const moments: {
  time: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  tone: string;
}[] = [
  {
    time: "09:41",
    icon: Mic,
    label: "Browser audio",
    detail: "New customer · 3m 18s",
    tone: "bg-blue-600 text-white",
  },
  {
    time: "09:44",
    icon: CalendarDays,
    label: "Request confirmed",
    detail: "Tuesday, 14:30 · Maya",
    tone: "bg-[#dff5e8] text-[#17623a]",
  },
  {
    time: "09:47",
    icon: MessageSquareText,
    label: "Web conversation",
    detail: "Pricing question resolved",
    tone: "bg-[#f8e9c8] text-[#6b4710]",
  },
];

const copyVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 + i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.55 + i * 0.1,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-b">
      <div className="absolute inset-0 hairline-grid opacity-45 mask-[linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="relative mx-auto grid max-w-350 gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.98fr_1.02fr] lg:px-12 lg:pb-28 lg:pt-30">
        <div
          className="relative flex items-center order-2 lg:order-1"
          style={{ perspective: 1400 }}
        >
          <motion.div
            className="w-full origin-center transform-3d"
            initial={
              reduceMotion
                ? false
                : { rotateY: -360, opacity: 0, scale: 0.88 }
            }
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    rotateY: {
                      duration: 1.05,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: { duration: 0.45, ease: "easeOut" },
                    scale: {
                      duration: 0.7,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }
            }
          >
            <div className="w-full border border-foreground/12 bg-card shadow-[18px_22px_0_0_oklch(0.205_0.018_264.4)]">
              <div className="flex items-center border-b px-5 py-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    Tuesday · Live desk
                  </p>
                  <p className="mt-1 text-sm font-semibold">Morning activity</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_oklch(0.9_0.08_151)]" />
                  Agent online
                </span>
              </div>
              <div className="p-3 sm:p-5">
                {moments.map(({ time, icon: Icon, label, detail, tone }, index) => (
                  <motion.div
                    key={label}
                    custom={index}
                    variants={rowVariants}
                    initial={reduceMotion ? false : "hidden"}
                    animate="show"
                    className="grid grid-cols-[42px_40px_1fr_auto] items-center gap-3 border-b px-1 py-4 last:border-0 sm:grid-cols-[48px_44px_1fr_auto]"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {time}
                    </span>
                    <span
                      className={`grid size-9 place-items-center rounded-md ${tone}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{label}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {detail}
                      </p>
                    </div>
                    <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:inline">
                      0{index + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t bg-[#171b24] text-white">
                {(
                  [
                    ["12", "requests"],
                    ["4", "booked"],
                    ["98%", "resolved"],
                  ] as const
                ).map(([value, label]) => (
                  <div
                    key={label}
                    className="border-r border-white/10 px-4 py-5 last:border-0"
                  >
                    <p className="font-heading text-3xl tracking-[-0.04em]">
                      {value}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/45">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="max-w-3xl order-1 lg:order-2">
          <motion.div
            custom={0}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
          >
            <Badge
              variant="outline"
              className="mb-7 rounded-sm bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
            >
              front desk Assistant · Tailored to your business
            </Badge>
          </motion.div>

          <motion.h1
            custom={1}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="font-heading text-[clamp(3.8rem,8vw,7.4rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance"
          >
            Every request,
            <span className="mt-3 block text-primary italic">one front door.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8"
          >
            Trimr answers questions, chats with clients, and organizes bookings
            for any service business—using your language, hours, people, and
            brand.
          </motion.p>

          <motion.div
            custom={3}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" className="h-12 gap-2 rounded-md px-6 shadow-none">
              <Link href="/sign-up">
                Build your assistant <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 gap-2 rounded-md bg-background px-6 shadow-none"
            >
              <Link href="/p/papafam-cuts">
                View a client page <MoveUpRight className="size-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            custom={4}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <Check className="size-3 text-primary" /> Start free
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-3 text-primary" /> No card required
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-3 text-primary" /> Built on Clerk + ElevenLabs
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
