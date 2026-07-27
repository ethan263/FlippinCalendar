"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  CalendarCheck2,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  MoveUpRight,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transitions } from "@/lib/motion/transitions";

type Panel = "hours" | "about" | "services" | "book" | "chat" | null;

const DEMO = {
  businessName: "Papa Fam Cuts",
  headline: "Sharp fades. Easy booking. A concierge that never sleeps.",
  about:
    "Neighborhood barbershop with walk-in energy and online booking calm. Ask the concierge about fades, kids cuts, or the next open chair.",
  timezone: "Africa/Johannesburg",
  accentColor: "#1B3A2F",
  backgroundColor: "#E8EFE9",
  foregroundColor: "#14201A",
  mutedColor: "#5C6B62",
  contact: {
    phone: "+27 21 555 0142",
    email: "hello@papafam.cuts",
    address: "14 Long Street, Cape Town",
  },
  hours: [
    { day: "Monday", ranges: "9:00 AM–6:00 PM" },
    { day: "Tuesday", ranges: "9:00 AM–6:00 PM" },
    { day: "Wednesday", ranges: "9:00 AM–7:00 PM" },
    { day: "Thursday", ranges: "9:00 AM–7:00 PM" },
    { day: "Friday", ranges: "9:00 AM–6:00 PM" },
    { day: "Saturday", ranges: "8:00 AM–4:00 PM" },
  ],
  services: [
    { name: "Signature fade", detail: "45 min · R280" },
    { name: "Kids cut", detail: "30 min · R180" },
    { name: "Beard tidy", detail: "20 min · R120" },
  ],
  chatReplies: [
    {
      role: "agent" as const,
      text: "Hey — welcome to Papa Fam Cuts. Looking for a fade, kids cut, or the next open chair?",
    },
    {
      role: "user" as const,
      text: "Do you have anything tomorrow afternoon?",
    },
    {
      role: "agent" as const,
      text: "Yes — Maya has 14:30 and 15:15 open tomorrow. Want me to hold one?",
    },
  ],
};

function contrastColor(color: string) {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(hex)) return "#ffffff";
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? "#151713" : "#ffffff";
}

function CollapsePanel({
  children,
  reduceMotion,
}: {
  children: ReactNode;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
      transition={transitions.smooth}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-black/8 bg-white px-4 py-4">
        {children}
      </div>
    </motion.div>
  );
}

export function DemoBusinessCard({
  onClose,
}: {
  onClose?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [panel, setPanel] = useState<Panel>(null);
  const primaryFg = contrastColor(DEMO.accentColor);

  const style = {
    "--background": DEMO.backgroundColor,
    "--foreground": DEMO.foregroundColor,
    "--primary": DEMO.accentColor,
    "--primary-foreground": primaryFg,
    "--muted": DEMO.mutedColor,
    "--card": "#ffffff",
  } as CSSProperties;

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div
      className="relative flex min-h-full items-center justify-center overflow-y-auto px-4 py-10 sm:px-6"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, color-mix(in srgb, ${DEMO.accentColor} 42%, transparent), transparent 42%),
            radial-gradient(circle at 88% 78%, color-mix(in srgb, ${DEMO.foregroundColor} 18%, transparent), transparent 46%),
            linear-gradient(160deg, ${DEMO.backgroundColor}, color-mix(in srgb, ${DEMO.backgroundColor} 72%, ${DEMO.accentColor} 28%))
          `,
        }}
      />

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full border border-black/10 bg-white/90 text-[var(--foreground)] shadow-sm backdrop-blur-sm sm:right-6 sm:top-6"
          aria-label="Close demo"
        >
          <X className="size-4" />
        </button>
      ) : null}

      <motion.article
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-black/8 bg-[var(--card)] text-[var(--foreground)] shadow-[0_28px_80px_rgba(20,18,14,0.22)]"
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { ...transitions.spring, duration: 0.9 }
        }
      >
        <div className="px-7 pb-5 pt-8 text-center sm:px-9">
          <div
            className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl text-lg font-semibold"
            style={{
              background: DEMO.accentColor,
              color: primaryFg,
            }}
          >
            P
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Demo · {DEMO.timezone.replace(/_/g, " ")}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em] text-balance">
            {DEMO.businessName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {DEMO.headline}
          </p>
        </div>

        <div className="space-y-3 px-5 pb-5 sm:px-6">
          <button
            type="button"
            onClick={() => toggle("hours")}
            className="flex w-full items-center gap-3 rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3.5 text-left transition-colors hover:bg-black/[0.04]"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]">
              <Clock3 className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Hours</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                Today · 9:00 AM–6:00 PM
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-[var(--muted)] transition-transform",
                panel === "hours" && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {panel === "hours" ? (
              <motion.div
                key="hours"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={transitions.smooth}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <ul className="space-y-2">
                    {DEMO.hours.map((day) => (
                      <li
                        key={day.day}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="font-medium">{day.day}</span>
                        <span className="text-right text-[var(--muted)]">
                          {day.ranges}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 justify-start gap-3 rounded-2xl px-4 text-base shadow-none"
              style={{
                background: DEMO.accentColor,
                color: primaryFg,
              }}
            >
              <a href={`tel:${DEMO.contact.phone.replace(/\s/g, "")}`}>
                <Phone className="size-5" />
                Call {DEMO.contact.phone}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 justify-start gap-3 rounded-2xl border-black/10 bg-white px-4 text-base shadow-none"
            >
              <a href={`mailto:${DEMO.contact.email}`}>
                <Mail className="size-5" />
                {DEMO.contact.email}
              </a>
            </Button>
            <div className="flex items-start gap-3 rounded-2xl border border-black/8 px-4 py-3.5 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
              <span className="leading-6 text-[var(--muted)]">
                {DEMO.contact.address}
              </span>
            </div>
          </div>

          <div className="grid gap-3 pt-1">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-14 gap-2 rounded-2xl border-black/10 bg-white text-base shadow-none"
              onClick={() => toggle("book")}
            >
              <CalendarCheck2 className="size-5" />
              Book
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="h-12 rounded-2xl text-sm"
              onClick={() => toggle("about")}
            >
              About
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  panel === "about" && "rotate-180",
                )}
              />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="h-12 rounded-2xl text-sm"
              onClick={() => toggle("services")}
            >
              Services
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  panel === "services" && "rotate-180",
                )}
              />
            </Button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {panel === "about" ? (
              <CollapsePanel key="about" reduceMotion={!!reduceMotion}>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {DEMO.about}
                </p>
              </CollapsePanel>
            ) : null}
            {panel === "services" ? (
              <CollapsePanel key="services" reduceMotion={!!reduceMotion}>
                <ul className="space-y-3">
                  {DEMO.services.map((service) => (
                    <li key={service.name} className="text-sm">
                      <p className="font-semibold">{service.name}</p>
                      <p className="mt-1 text-[var(--muted)]">{service.detail}</p>
                    </li>
                  ))}
                </ul>
              </CollapsePanel>
            ) : null}
            {panel === "book" ? (
              <CollapsePanel key="book" reduceMotion={!!reduceMotion}>
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-[var(--primary)]" />
                    Demo booking
                  </p>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    On a live page this expands into the full booking flow.
                    Pick a service, time, and confirm — powered by your
                    workspace availability.
                  </p>
                  <ul className="space-y-2">
                    {DEMO.services.map((service) => (
                      <li
                        key={service.name}
                        className="rounded-xl border border-black/8 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium">{service.name}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {service.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsePanel>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative border-t border-black/8 px-5 py-5 sm:px-6">
          <AnimatePresence>
            {panel === "chat" ? (
              <motion.div
                key="chat"
                className="mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white"
                initial={
                  reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, y: 12, scale: 0.98 }
                }
                transition={transitions.spring}
              >
                <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
                  <p className="text-sm font-semibold">Ask anything</p>
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full hover:bg-black/5"
                    onClick={() => setPanel(null)}
                    aria-label="Close chat"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  {DEMO.chatReplies.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={
                        reduceMotion ? false : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: reduceMotion ? 0 : 0.08 + index * 0.12,
                        ...transitions.smooth,
                      }}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-5",
                        message.role === "agent"
                          ? "bg-black/[0.04] text-[var(--foreground)]"
                          : "ml-auto bg-[var(--primary)] text-[var(--primary-foreground)]",
                      )}
                    >
                      {message.text}
                    </motion.div>
                  ))}
                  <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Demo conversation
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => toggle("chat")}
            className="mx-auto flex size-16 items-center justify-center rounded-full shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
            style={{
              background: DEMO.accentColor,
              color: primaryFg,
            }}
            aria-label={panel === "chat" ? "Close AI chat" : "Open AI chat"}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            animate={
              reduceMotion || panel === "chat"
                ? undefined
                : {
                    scale: [1, 1.04, 1],
                    transition: {
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
            }
          >
            {panel === "chat" ? (
              <X className="size-6" />
            ) : (
              <MessageCircle className="size-6" />
            )}
          </motion.button>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {panel === "chat" ? "Concierge open" : "Chat with us"}
          </p>
        </div>
      </motion.article>
    </div>
  );
}

export function HeroDemoCardTrigger({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <Button
        type="button"
        size="lg"
        variant="outline"
        className={cn(
          "h-12 gap-2 rounded-md bg-background px-6 shadow-none",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        Visit a demo card
        <MoveUpRight className="size-4" />
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-10000"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={transitions.smooth}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#14201A]/55 backdrop-blur-[2px]"
              aria-label="Close demo overlay"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-0 overflow-y-auto">
              <DemoBusinessCard onClose={() => setOpen(false)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
