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
  Phone,
  X,
} from "lucide-react";

import { AgentLauncher } from "@/components/public-site/agent-launcher";
import { BookingFlow } from "@/components/public-site/booking-flow";
import { ElevenLabsEmbed } from "@/components/public-site/elevenlabs-embed";
import type { PublishedSite } from "@/components/public-site/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transitions } from "@/lib/motion/transitions";

type Panel = "hours" | "about" | "offerings" | "faq" | "booking" | "chat" | null;

function formatMinute(minute: number) {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const display = ((hours + 11) % 12) + 1;
  return `${display}:${mins.toString().padStart(2, "0")} ${period}`;
}

function safeHttpUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function contrastColor(color: string) {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(hex)) return "#ffffff";
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? "#151713" : "#ffffff";
}

export function BusinessCardSite({
  siteSlug,
  publishedSite,
  textAgentEnabled,
  voiceAgentEnabled,
}: {
  siteSlug: string;
  publishedSite: PublishedSite;
  textAgentEnabled: boolean;
  voiceAgentEnabled: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [panel, setPanel] = useState<Panel>(null);
  const { organization, site, offerings, knowledgeItems, weeklyHours } =
    publishedSite;
  const { config } = site;
  const logoUrl = safeHttpUrl(config.logoUrl);
  const sectionSet = new Set(config.sections);
  const bookingVisible =
    config.booking.enabled && sectionSet.has("booking");
  const textAgentVisible = textAgentEnabled && config.agent.showWebChat;
  const voiceAgentVisible = voiceAgentEnabled && config.agent.showVoiceChat;
  const widgetVisible =
    voiceAgentEnabled && config.agent.showElevenLabsWidget;
  const agentVisible = textAgentVisible || voiceAgentVisible;
  const primaryFg = contrastColor(config.theme.accentColor);

  const style = {
    "--background": config.theme.backgroundColor,
    "--foreground": config.theme.foregroundColor,
    "--primary": config.theme.accentColor,
    "--primary-foreground": primaryFg,
    "--muted": config.theme.mutedColor,
    "--card": "#ffffff",
  } as CSSProperties;

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  const todayLabel = new Intl.DateTimeFormat(organization.locale || "en", {
    weekday: "long",
    timeZone: organization.timezone,
  }).format(new Date());
  const todayHours = weeklyHours.find(
    (day) => day.label.toLowerCase() === todayLabel.toLowerCase(),
  );

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-6"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, color-mix(in srgb, ${config.theme.accentColor} 42%, transparent), transparent 42%),
            radial-gradient(circle at 88% 78%, color-mix(in srgb, ${config.theme.foregroundColor} 18%, transparent), transparent 46%),
            linear-gradient(160deg, ${config.theme.backgroundColor}, color-mix(in srgb, ${config.theme.backgroundColor} 72%, ${config.theme.accentColor} 28%))
          `,
        }}
      />

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
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="mx-auto mb-5 size-16 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div
              className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl text-lg font-semibold"
              style={{
                background: config.theme.accentColor,
                color: primaryFg,
              }}
            >
              {config.businessName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {organization.timezone.replace(/_/g, " ")}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em] text-balance">
            {config.businessName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {config.headline}
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
                {todayHours
                  ? `Today · ${todayHours.ranges
                      .map(
                        (range) =>
                          `${formatMinute(range.startMinute)}–${formatMinute(range.endMinute)}`,
                      )
                      .join(", ")}`
                  : weeklyHours.length
                    ? "Tap for weekly hours"
                    : "Hours by appointment"}
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
                  {weeklyHours.length ? (
                    <ul className="space-y-2">
                      {weeklyHours.map((day) => (
                        <li
                          key={day.dayOfWeek}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="font-medium">{day.label}</span>
                          <span className="text-right text-[var(--muted)]">
                            {day.ranges
                              .map(
                                (range) =>
                                  `${formatMinute(range.startMinute)}–${formatMinute(range.endMinute)}`,
                              )
                              .join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      Availability is confirmed when you book.
                    </p>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid gap-3">
            {config.contact.phone ? (
              <Button
                asChild
                size="lg"
                className="h-14 justify-start gap-3 rounded-2xl px-4 text-base shadow-none"
                style={{
                  background: config.theme.accentColor,
                  color: primaryFg,
                }}
              >
                <a href={`tel:${config.contact.phone}`}>
                  <Phone className="size-5" />
                  Call {config.contact.phone}
                </a>
              </Button>
            ) : null}
            {config.contact.email ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 justify-start gap-3 rounded-2xl border-black/10 bg-white px-4 text-base shadow-none"
              >
                <a href={`mailto:${config.contact.email}`}>
                  <Mail className="size-5" />
                  {config.contact.email}
                </a>
              </Button>
            ) : null}
            {config.contact.address ? (
              <div className="flex items-start gap-3 rounded-2xl border border-black/8 px-4 py-3.5 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                <span className="leading-6 text-[var(--muted)]">
                  {config.contact.address}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 pt-1">
            {bookingVisible ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-14 gap-2 rounded-2xl border-black/10 bg-white text-base shadow-none"
                onClick={() => toggle("booking")}
              >
                <CalendarCheck2 className="size-5" />
                Book
              </Button>
            ) : null}
            {sectionSet.has("about") ? (
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
            ) : null}
            {sectionSet.has("offerings") && offerings.length ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="h-12 rounded-2xl text-sm"
                onClick={() => toggle("offerings")}
              >
                {organization.terminology.offeringPlural}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    panel === "offerings" && "rotate-180",
                  )}
                />
              </Button>
            ) : null}
            {sectionSet.has("faq") && knowledgeItems.length ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="h-12 rounded-2xl text-sm"
                onClick={() => toggle("faq")}
              >
                FAQ
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    panel === "faq" && "rotate-180",
                  )}
                />
              </Button>
            ) : null}
          </div>

          <AnimatePresence initial={false} mode="wait">
            {panel === "about" ? (
              <CollapsePanel key="about" reduceMotion={!!reduceMotion}>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {config.about}
                </p>
              </CollapsePanel>
            ) : null}
            {panel === "offerings" ? (
              <CollapsePanel key="offerings" reduceMotion={!!reduceMotion}>
                <ul className="space-y-3">
                  {offerings.map((offering) => (
                    <li key={offering._id} className="text-sm">
                      <p className="font-semibold">{offering.name}</p>
                      <p className="mt-1 text-[var(--muted)]">
                        {offering.durationMinutes} min
                        {offering.description
                          ? ` · ${offering.description}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </CollapsePanel>
            ) : null}
            {panel === "faq" ? (
              <CollapsePanel key="faq" reduceMotion={!!reduceMotion}>
                <ul className="space-y-4">
                  {knowledgeItems.map((item) => (
                    <li key={item._id}>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {item.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </CollapsePanel>
            ) : null}
            {panel === "booking" ? (
              <CollapsePanel key="booking" reduceMotion={!!reduceMotion}>
                <BookingFlow
                  siteSlug={siteSlug}
                  businessName={config.businessName}
                  offerings={offerings}
                  teamMembers={publishedSite.teamMembers}
                  terminology={organization.terminology}
                  locale={organization.locale}
                  currency={organization.currency}
                  timezone={organization.timezone}
                  maximumAdvanceDays={config.booking.maximumAdvanceDays}
                />
              </CollapsePanel>
            ) : null}
          </AnimatePresence>
        </div>

        {agentVisible ? (
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
                  <div className="max-h-[min(28rem,55dvh)] overflow-y-auto p-3">
                    <AgentLauncher
                      siteSlug={siteSlug}
                      businessName={config.businessName}
                      welcomeMessage={config.agent.welcomeMessage}
                      textEnabled={textAgentVisible}
                      voiceEnabled={voiceAgentVisible}
                      offerings={offerings}
                      teamMembers={publishedSite.teamMembers}
                      timezone={organization.timezone}
                      locale={organization.locale}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={() => toggle("chat")}
              className="mx-auto flex size-16 items-center justify-center rounded-full shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
              style={{
                background: config.theme.accentColor,
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
        ) : null}
      </motion.article>

      {widgetVisible ? (
        <ElevenLabsEmbed
          siteSlug={siteSlug}
          businessName={config.businessName}
          primaryColor={config.theme.accentColor}
          secondaryColor={config.theme.foregroundColor}
          offerings={offerings}
          teamMembers={publishedSite.teamMembers}
          timezone={organization.timezone}
          locale={organization.locale}
        />
      ) : null}
    </div>
  );
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
