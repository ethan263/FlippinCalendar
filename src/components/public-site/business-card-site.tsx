"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  ChevronRight,
  Clock3,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { AgentLauncher } from "@/components/public-site/agent-launcher";
import { BookingFlow } from "@/components/public-site/booking-flow";
import { ElevenLabsEmbed } from "@/components/public-site/elevenlabs-embed";
import type { PublishedSite } from "@/components/public-site/types";
import { transitions } from "@/lib/motion/transitions";

type Panel =
  | "hours"
  | "about"
  | "offerings"
  | "team"
  | "faq"
  | "booking"
  | "contact"
  | "chat"
  | null;

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
  const { organization, site, offerings, knowledgeItems, weeklyHours, teamMembers } =
    publishedSite;
  const { config } = site;
  const logoUrl = safeHttpUrl(config.logoUrl);
  const heroImageUrl = safeHttpUrl(config.heroImageUrl);
  const sectionSet = new Set(config.sections);
  const bookingVisible =
    config.booking.enabled && sectionSet.has("booking");
  const textAgentVisible = textAgentEnabled && config.agent.showWebChat;
  const voiceAgentVisible = voiceAgentEnabled && config.agent.showVoiceChat;
  const widgetVisible =
    voiceAgentEnabled && config.agent.showElevenLabsWidget;
  const agentVisible = textAgentVisible || voiceAgentVisible;
  const primaryFg = contrastColor(config.theme.accentColor);
  const contactVisible =
    sectionSet.has("contact") &&
    Boolean(
      config.contact.phone || config.contact.email || config.contact.address,
    );

  const style = {
    "--background": config.theme.backgroundColor,
    "--foreground": config.theme.foregroundColor,
    "--primary": config.theme.accentColor,
    "--primary-foreground": primaryFg,
    "--muted": config.theme.mutedColor,
    "--card": "#ffffff",
  } as CSSProperties;

  function open(next: Panel) {
    setPanel(next);
  }

  function close() {
    setPanel(null);
  }

  const todayLabel = new Intl.DateTimeFormat(organization.locale || "en", {
    weekday: "long",
    timeZone: organization.timezone,
  }).format(new Date());
  const todayHours = weeklyHours.find(
    (day) => day.label.toLowerCase() === todayLabel.toLowerCase(),
  );

  const meshBackground = heroImageUrl
    ? {
        backgroundImage: `
          linear-gradient(160deg, rgba(18,18,20,0.18), rgba(18,18,20,0.55)),
          url(${JSON.stringify(heroImageUrl)})
        `,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : {
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 18% 12%, color-mix(in srgb, ${config.theme.foregroundColor} 55%, transparent), transparent 58%),
          radial-gradient(ellipse 70% 50% at 88% 78%, color-mix(in srgb, ${config.theme.accentColor} 28%, transparent), transparent 55%),
          radial-gradient(circle at 50% 45%, color-mix(in srgb, ${config.theme.mutedColor} 35%, #c8c6c0), color-mix(in srgb, ${config.theme.foregroundColor} 22%, #9a9892) 70%),
          linear-gradient(145deg, #d8d6d0, #a8a69f)
        `,
      };

  const options: Array<{
    id: Exclude<Panel, null>;
    label: string;
    hint: string;
    icon: ReactNode;
    show: boolean;
  }> = [
    {
      id: "booking",
      label: "Find a time",
      hint: "Book online",
      icon: <CalendarCheck2 className="size-4" aria-hidden />,
      show: bookingVisible,
    },
    {
      id: "offerings",
      label: organization.terminology.offeringPlural,
      hint: offerings.length
        ? `${offerings.length} available`
        : "Coming soon",
      icon: <Sparkles className="size-4" aria-hidden />,
      show: sectionSet.has("offerings"),
    },
    {
      id: "hours",
      label: "Hours",
      hint: todayHours
        ? todayHours.ranges
            .map(
              (range) =>
                `${formatMinute(range.startMinute)}–${formatMinute(range.endMinute)}`,
            )
            .join(", ")
        : "By appointment",
      icon: <Clock3 className="size-4" aria-hidden />,
      show: true,
    },
    {
      id: "team",
      label: organization.terminology.teamMemberPlural,
      hint:
        teamMembers.length === 1
          ? teamMembers[0]?.name ?? "Meet the team"
          : `${teamMembers.length} people`,
      icon: <Users className="size-4" aria-hidden />,
      show: sectionSet.has("team") && teamMembers.length > 0,
    },
    {
      id: "about",
      label: "About",
      hint: "Our story",
      icon: <Sparkles className="size-4" aria-hidden />,
      show: sectionSet.has("about") && Boolean(config.about?.trim()),
    },
    {
      id: "faq",
      label: "FAQ",
      hint: `${knowledgeItems.length} answers`,
      icon: <HelpCircle className="size-4" aria-hidden />,
      show: sectionSet.has("faq") && knowledgeItems.length > 0,
    },
    {
      id: "contact",
      label: "Contact",
      hint: config.contact.phone || config.contact.email || "Get in touch",
      icon: <Phone className="size-4" aria-hidden />,
      show: contactVisible,
    },
    {
      id: "chat",
      label: "Ask AI",
      hint: "Chat or voice",
      icon: <MessageCircle className="size-4" aria-hidden />,
      show: agentVisible,
    },
  ];

  const visibleOptions = options.filter((option) => option.show);

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-3 py-3 sm:px-5 sm:py-5"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 12% 8%, color-mix(in srgb, ${config.theme.accentColor} 12%, transparent), transparent 40%),
            linear-gradient(180deg, color-mix(in srgb, ${config.theme.backgroundColor} 92%, #f7f5ef), color-mix(in srgb, ${config.theme.backgroundColor} 88%, #ebe7de))
          `,
        }}
      />

      <motion.article
        className="relative z-10 flex h-[min(100dvh-1.5rem,52rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-black/8 shadow-[0_28px_90px_rgba(28,24,18,0.22)] sm:h-[min(100dvh-2.5rem,54rem)] sm:rounded-[2rem]"
        style={meshBackground}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { ...transitions.spring, duration: 0.85 }
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/25 via-transparent to-black/35"
        />

        <header className="relative z-10 flex items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover ring-1 ring-white/40"
              />
            ) : (
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-white/30"
                style={{
                  background: config.theme.accentColor,
                  color: primaryFg,
                }}
              >
                {initials(config.businessName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold tracking-[-0.02em] text-white drop-shadow-sm">
                {config.businessName}
              </p>
              <p className="truncate text-[0.65rem] tracking-[0.12em] text-white/65 uppercase">
                {organization.timezone.replaceAll("_", " ")}
              </p>
            </div>
          </div>

          {agentVisible ? (
            <motion.button
              type="button"
              onClick={() => open("chat")}
              className="grid size-11 shrink-0 place-items-center rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/25"
              style={{
                background: config.theme.accentColor,
                color: primaryFg,
              }}
              aria-label="Open AI concierge"
              aria-expanded={panel === "chat"}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              animate={
                reduceMotion || panel === "chat"
                  ? undefined
                  : {
                      scale: [1, 1.05, 1],
                      transition: {
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
              }
            >
              <MessageCircle className="size-5" />
            </motion.button>
          ) : null}
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-3 sm:px-5">
          <motion.div
            className="mt-auto rounded-[1.35rem] border border-white/35 bg-white/82 p-3 shadow-[0_18px_50px_rgba(20,16,12,0.18)] backdrop-blur-xl sm:p-3.5"
            animate={
              reduceMotion
                ? undefined
                : panel
                  ? { opacity: 0.35, y: -28, scale: 0.9, filter: "blur(2px)" }
                  : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            transition={transitions.page}
            style={{ transformOrigin: "50% 100%" }}
          >
            <p className="px-2 pb-2 text-[0.62rem] font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
              {config.headline || "Choose an option"}
            </p>
            <ul className="max-h-[min(42dvh,22rem)] space-y-1 overflow-y-auto overscroll-contain">
              {visibleOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => open(option.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-black/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/40"
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${config.theme.accentColor} 14%, transparent)`,
                        color: config.theme.accentColor,
                      }}
                    >
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {option.hint}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          className="relative z-10 mx-4 mb-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/12 bg-black/45 px-4 py-3.5 text-white backdrop-blur-md sm:mx-5 sm:mb-5"
          animate={
            reduceMotion
              ? undefined
              : panel
                ? { opacity: 0.25, y: -18, scale: 0.94 }
                : { opacity: 1, y: 0, scale: 1 }
          }
          transition={transitions.page}
        >
          <div className="min-w-0">
            <p className="text-[0.62rem] tracking-[0.18em] text-white/55 uppercase">
              Welcome to
            </p>
            <p className="mt-0.5 truncate font-heading text-base font-medium tracking-[-0.02em] sm:text-lg">
              {config.businessName}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              open(
                bookingVisible
                  ? "booking"
                  : agentVisible
                    ? "chat"
                    : contactVisible
                      ? "contact"
                      : "about",
              )
            }
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={
              bookingVisible
                ? "Book now"
                : agentVisible
                  ? "Ask AI"
                  : "Open details"
            }
          >
            <ArrowRight className="size-4" />
          </button>
        </motion.div>

        <AnimatePresence>
          {panel ? (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col bg-[color-mix(in_srgb,var(--background)_92%,white)] shadow-[0_24px_80px_rgba(20,16,12,0.28)]"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 48, scale: 1.04 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: 36, scale: 1.02 }
              }
              transition={transitions.page}
            >
              <div className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-3.5 sm:px-5">
                <p className="font-heading text-lg font-semibold tracking-[-0.02em]">
                  {panel === "booking"
                    ? "Find a time"
                    : panel === "offerings"
                      ? organization.terminology.offeringPlural
                      : panel === "hours"
                        ? "Hours"
                        : panel === "team"
                          ? organization.terminology.teamMemberPlural
                          : panel === "about"
                            ? "About"
                            : panel === "faq"
                              ? "FAQ"
                              : panel === "contact"
                                ? "Contact"
                                : "Ask AI"}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="grid size-9 place-items-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <motion.div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transitions.page}
              >
                {panel === "hours" ? (
                  weeklyHours.length ? (
                    <ul className="space-y-3">
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
                  )
                ) : null}

                {panel === "about" ? (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    {config.about}
                  </p>
                ) : null}

                {panel === "offerings" ? (
                  offerings.length ? (
                    <ul className="space-y-3">
                      {offerings.map((offering) => (
                        <li
                          key={offering._id}
                          className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3.5"
                        >
                          <p className="font-semibold">{offering.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {offering.durationMinutes} min
                            {offering.description
                              ? ` · ${offering.description}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      New{" "}
                      {organization.terminology.offeringPlural.toLowerCase()}{" "}
                      will appear here soon.
                    </p>
                  )
                ) : null}

                {panel === "team" ? (
                  <ul className="space-y-3">
                    {teamMembers.map((member) => (
                      <li
                        key={member._id}
                        className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3.5"
                      >
                        <p className="font-semibold">{member.name}</p>
                        {member.title ? (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {member.title}
                          </p>
                        ) : null}
                        {member.bio ? (
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            {member.bio}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {panel === "faq" ? (
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
                ) : null}

                {panel === "contact" ? (
                  <div className="space-y-3">
                    {config.contact.phone ? (
                      <a
                        href={`tel:${config.contact.phone}`}
                        className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3.5 text-sm font-medium"
                      >
                        <Phone className="size-4 text-[var(--primary)]" />
                        {config.contact.phone}
                      </a>
                    ) : null}
                    {config.contact.email ? (
                      <a
                        href={`mailto:${config.contact.email}`}
                        className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3.5 text-sm font-medium"
                      >
                        <Mail className="size-4 text-[var(--primary)]" />
                        {config.contact.email}
                      </a>
                    ) : null}
                    {config.contact.address ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3.5 text-sm">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
                        <span className="leading-6 text-[var(--muted)]">
                          {config.contact.address}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {panel === "booking" ? (
                  <BookingFlow
                    siteSlug={siteSlug}
                    businessName={config.businessName}
                    offerings={offerings}
                    teamMembers={teamMembers}
                    terminology={organization.terminology}
                    locale={organization.locale}
                    currency={organization.currency}
                    timezone={organization.timezone}
                    maximumAdvanceDays={config.booking.maximumAdvanceDays}
                  />
                ) : null}

                {panel === "chat" && agentVisible ? (
                  <AgentLauncher
                    siteSlug={siteSlug}
                    businessName={config.businessName}
                    welcomeMessage={config.agent.welcomeMessage}
                    textEnabled={textAgentVisible}
                    voiceEnabled={voiceAgentVisible}
                    offerings={offerings}
                    teamMembers={teamMembers}
                    timezone={organization.timezone}
                    locale={organization.locale}
                  />
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.article>

      {widgetVisible ? (
        <ElevenLabsEmbed
          siteSlug={siteSlug}
          businessName={config.businessName}
          primaryColor={config.theme.accentColor}
          secondaryColor={config.theme.foregroundColor}
          offerings={offerings}
          teamMembers={teamMembers}
          timezone={organization.timezone}
          locale={organization.locale}
          textInputEnabled={textAgentEnabled}
        />
      ) : null}
    </div>
  );
}
