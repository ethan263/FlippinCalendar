"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Bot,
  Check,
  Globe2,
  MessageCircle,
  Mic,
  Sparkles,
} from "lucide-react";

import {
  StackedFlowCards,
  type StackDirection,
} from "@/components/motion/stacked-flow-cards";
import { OrbDemo } from "@/components/ui/orb-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AGENT_CONFIGURE,
  FREE_PLAN_GREETINGS,
  FREE_PLAN_LANGUAGES,
  FREE_PLAN_PACES,
  FREE_PLAN_PERSONAS,
  FREE_PLAN_SURFACES,
  FREE_PLAN_VOICES,
  resolveGreeting,
  type AgentConfigureDraft,
  type AgentLanguageId,
  type AgentPaceId,
  type AgentPersonaId,
  type AgentSurfaceId,
  type AgentVoiceId,
} from "@/lib/elevenlabs/free-plan-presets";

type StepId =
  | "persona"
  | "voice"
  | "pace"
  | "language"
  | "surface"
  | "greeting"
  | "review";

const STEPS: StepId[] = [
  "persona",
  "voice",
  "pace",
  "language",
  "surface",
  "greeting",
  "review",
];

type Entitlements = {
  webAgent: boolean;
  browserVoice: boolean;
  isLoaded: boolean;
};

function OptionCard({
  selected,
  title,
  hint,
  disabled,
  onSelect,
  icon,
}: {
  selected: boolean;
  title: string;
  hint: string;
  disabled?: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-black/10 bg-white hover:border-black/20",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border",
          selected
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-black/10 bg-[#f7f6f3] text-muted-foreground",
        )}
      >
        {icon ?? <Sparkles className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 break-words text-sm font-semibold">
          {title}
          {selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
        </span>
        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h3 className="mt-1 break-words font-heading text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AgentConfigureWizard({
  businessName,
  entitlements,
  initial,
  saving,
  onApply,
}: {
  businessName: string;
  entitlements: Entitlements;
  initial?: Partial<AgentConfigureDraft> | null;
  saving?: boolean;
  onApply: (draft: AgentConfigureDraft) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<AgentConfigureDraft>({
    ...DEFAULT_AGENT_CONFIGURE,
    ...initial,
    surface:
      initial?.surface ??
      (entitlements.browserVoice && entitlements.webAgent
        ? "both"
        : entitlements.webAgent
          ? "chat"
          : entitlements.browserVoice
            ? "voice"
            : "chat"),
  });
  const [step, setStep] = useState<StepId>("persona");
  const [direction, setDirection] = useState<StackDirection>(1);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const greetingPreview = useMemo(
    () => resolveGreeting(draft, businessName),
    [businessName, draft],
  );

  function goTo(next: StepId) {
    const nextIndex = STEPS.indexOf(next);
    setDirection(nextIndex >= stepIndex ? 1 : -1);
    setStep(next);
    setError(null);
  }

  function goBack() {
    if (stepIndex <= 0) return;
    goTo(STEPS[stepIndex - 1]);
  }

  function goNext() {
    if (step === "surface") {
      const surface = FREE_PLAN_SURFACES.find((item) => item.id === draft.surface);
      if (!surface) return;
      const missing = surface.requires.filter((feature) =>
        feature === "web_agent" ? !entitlements.webAgent : !entitlements.browserVoice,
      );
      if (missing.length) {
        setError(
          "That channel needs a plan upgrade. Pick a surface your organization already includes.",
        );
        return;
      }
    }
    if (stepIndex >= STEPS.length - 1) return;
    goTo(STEPS[stepIndex + 1]);
  }

  async function apply() {
    setError(null);
    try {
      await onApply(draft);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save agent configuration.",
      );
    }
  }

  return (
    <div className="flex max-h-[min(90dvh,52rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#faf9f5]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/8 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Configure · ElevenLabs Free-compatible
          </p>
          <p className="mt-1 text-sm font-medium">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
        <p className="max-w-xs break-words text-[11px] leading-5 text-muted-foreground">
          Stock voices, multilingual, widget/chat, knowledge — no cloning or
          telephony on Free.
        </p>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(14rem,0.85fr)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain p-4 sm:p-6">
          <StackedFlowCards
            stepKey={step}
            direction={direction}
            depth={2}
            className="min-w-0"
          >
            {step === "persona" ? (
              <div>
                <StepHeading
                  eyebrow="Role"
                  title="What should the concierge focus on?"
                  description="Pick a preset personality. Knowledge and booking tools stay available on every option."
                />
                <div className="space-y-2">
                  {FREE_PLAN_PERSONAS.map((persona) => (
                    <OptionCard
                      key={persona.id}
                      selected={draft.persona === persona.id}
                      title={persona.label}
                      hint={persona.hint}
                      icon={<Bot className="size-4" />}
                      onSelect={() =>
                        setDraft((current) => ({
                          ...current,
                          persona: persona.id as AgentPersonaId,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === "voice" ? (
              <div>
                <StepHeading
                  eyebrow="Voice"
                  title="Choose a stock voice"
                  description="Free plan uses the shared voice library — no instant or pro cloning."
                />
                <div className="space-y-2">
                  {FREE_PLAN_VOICES.map((voice) => (
                    <OptionCard
                      key={voice.id}
                      selected={draft.voice === voice.id}
                      title={voice.label}
                      hint={voice.hint}
                      icon={<Mic className="size-4" />}
                      onSelect={() =>
                        setDraft((current) => ({
                          ...current,
                          voice: voice.id as AgentVoiceId,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === "pace" ? (
              <div>
                <StepHeading
                  eyebrow="Turn-taking"
                  title="How quickly should it reply?"
                  description="Maps to ElevenLabs turn eagerness: patient, normal, or eager."
                />
                <div className="space-y-2">
                  {FREE_PLAN_PACES.map((pace) => (
                    <OptionCard
                      key={pace.id}
                      selected={draft.pace === pace.id}
                      title={pace.label}
                      hint={pace.hint}
                      onSelect={() =>
                        setDraft((current) => ({
                          ...current,
                          pace: pace.id as AgentPaceId,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === "language" ? (
              <div>
                <StepHeading
                  eyebrow="Language"
                  title="Primary conversation language"
                  description="Multilingual is included on ElevenLabs Free. Start with one primary language."
                />
                <div className="space-y-2">
                  {FREE_PLAN_LANGUAGES.map((language) => (
                    <OptionCard
                      key={language.id}
                      selected={draft.language === language.id}
                      title={language.label}
                      hint={language.hint}
                      icon={<Globe2 className="size-4" />}
                      onSelect={() =>
                        setDraft((current) => ({
                          ...current,
                          language: language.id as AgentLanguageId,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === "surface" ? (
              <div>
                <StepHeading
                  eyebrow="Public card"
                  title="Where should visitors talk to the agent?"
                  description="Channels still require your flippinCalendar plan (Pro for text, Voice for microphone)."
                />
                <div className="space-y-2">
                  {FREE_PLAN_SURFACES.map((surface) => {
                    const locked = surface.requires.some((feature) =>
                      feature === "web_agent"
                        ? !entitlements.webAgent
                        : !entitlements.browserVoice,
                    );
                    return (
                      <OptionCard
                        key={surface.id}
                        selected={draft.surface === surface.id}
                        title={surface.label}
                        hint={
                          locked
                            ? `${surface.hint} · upgrade required`
                            : surface.hint
                        }
                        disabled={!entitlements.isLoaded || locked}
                        icon={
                          surface.id === "voice" ? (
                            <AudioLines className="size-4" />
                          ) : (
                            <MessageCircle className="size-4" />
                          )
                        }
                        onSelect={() =>
                          setDraft((current) => ({
                            ...current,
                            surface: surface.id as AgentSurfaceId,
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === "greeting" ? (
              <div>
                <StepHeading
                  eyebrow="First message"
                  title="What should it say first?"
                  description="This becomes the opening line on text and voice sessions."
                />
                <div className="space-y-2">
                  {FREE_PLAN_GREETINGS.map((greeting) => (
                    <OptionCard
                      key={greeting.id}
                      selected={draft.greetingId === greeting.id}
                      title={greeting.label}
                      hint={greeting.template.replaceAll(
                        "{{business_name}}",
                        businessName,
                      )}
                      onSelect={() =>
                        setDraft((current) => ({
                          ...current,
                          greetingId: greeting.id,
                        }))
                      }
                    />
                  ))}
                  <OptionCard
                    selected={draft.greetingId === "custom"}
                    title="Custom line"
                    hint="Write your own opening (max 500 characters)"
                    onSelect={() =>
                      setDraft((current) => ({
                        ...current,
                        greetingId: "custom",
                      }))
                    }
                  />
                </div>
                {draft.greetingId === "custom" ? (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="custom-greeting">Custom greeting</Label>
                    <Input
                      id="custom-greeting"
                      value={draft.customGreeting ?? ""}
                      maxLength={500}
                      placeholder={`Hi from ${businessName}…`}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customGreeting: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === "review" ? (
              <div>
                <StepHeading
                  eyebrow="Review"
                  title="Ready to apply"
                  description="We’ll save these Free-compatible settings to your public card and use them on the next visitor session."
                />
                <ul className="space-y-2 rounded-2xl border border-black/10 bg-white p-4 text-sm">
                  <li>
                    <span className="text-muted-foreground">Role · </span>
                    {
                      FREE_PLAN_PERSONAS.find((item) => item.id === draft.persona)
                        ?.label
                    }
                  </li>
                  <li>
                    <span className="text-muted-foreground">Voice · </span>
                    {
                      FREE_PLAN_VOICES.find((item) => item.id === draft.voice)
                        ?.label
                    }
                  </li>
                  <li>
                    <span className="text-muted-foreground">Pace · </span>
                    {FREE_PLAN_PACES.find((item) => item.id === draft.pace)?.label}
                  </li>
                  <li>
                    <span className="text-muted-foreground">Language · </span>
                    {
                      FREE_PLAN_LANGUAGES.find(
                        (item) => item.id === draft.language,
                      )?.label
                    }
                  </li>
                  <li>
                    <span className="text-muted-foreground">Surface · </span>
                    {
                      FREE_PLAN_SURFACES.find((item) => item.id === draft.surface)
                        ?.label
                    }
                  </li>
                  <li className="pt-2 text-xs leading-5 text-muted-foreground">
                    “{greetingPreview}”
                  </li>
                </ul>
              </div>
            ) : null}
          </StackedFlowCards>

          {error ? (
            <p className="mt-4 text-xs text-rose-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex shrink-0 items-center justify-between gap-3 border-t border-black/8 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || saving}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            {step === "review" ? (
              <Button type="button" onClick={() => void apply()} disabled={saving}>
                {saving ? "Saving…" : "Apply & publish Orb"}
                <Check data-icon="inline-end" />
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={saving}>
                Continue
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
          </div>
        </div>

        <aside className="min-w-0 border-t border-black/8 bg-[#20201e] p-4 text-white sm:p-5 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:border-black/20">
          <OrbDemo
            small
            hideControls
            title="Public Orb preview"
            description="Visitors see this launcher on the business card when a channel is enabled."
            className="border-white/10 bg-white/5 text-white [&_h3]:text-white [&_p]:text-white/55"
            colors={
              draft.voice === "sarah"
                ? ["#F6E7D8", "#E0CFC2"]
                : draft.voice === "george"
                  ? ["#E5E7EB", "#9CA3AF"]
                  : ["#CADCFC", "#A0B9D1"]
            }
          />
          <p className="mt-4 text-[11px] leading-5 text-white/45">
            Free plan limits (~15 min / month on ElevenLabs Free) still apply at
            the provider. flippinCalendar Pro/Voice unlock which channels appear
            on your public card.
          </p>
        </aside>
      </div>
    </div>
  );
}
