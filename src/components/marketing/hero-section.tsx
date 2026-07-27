"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedContainer } from "@/components/motion/animated-container";
import { HeroDemoCardTrigger } from "@/components/marketing/hero-demo-business-card";
import { HeroMotionVideo } from "@/components/marketing/hero-motion-video";
import { transitions } from "@/lib/motion/transitions";

const copyVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 + i * 0.08,
      ...transitions.smooth,
      duration: 0.55,
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
        <div className="max-w-3xl order-1 lg:order-1">
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
              AI concierge · Tailored to your business
            </Badge>
          </motion.div>

          <motion.h1
            custom={1}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="font-heading text-[clamp(3.8rem,8vw,7.4rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance"
          >
            The smart choice
            <span className="mt-3 block text-primary italic">concierge.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={copyVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8"
          >
            flippinCalendar answers questions, chats with clients, and organizes
            bookings for any service business—using your language, hours, people,
            and brand.
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
            <AnimatedContainer animation="scaleIn" delay={0.32} duration={0.35}>
              <HeroDemoCardTrigger />
            </AnimatedContainer>
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

        <HeroMotionVideo />
      </div>
    </section>
  );
}
