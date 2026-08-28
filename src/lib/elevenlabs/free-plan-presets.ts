/**
 * Configure presets aligned with ElevenLabs Agents Free plan:
 * Workflow builder, Knowledge base, Multilingual, Widget, stock voices.
 * Excludes paid-only: commercial telephony, voice cloning, custom SSO/HIPAA,
 * high concurrency, and custom LLM endpoints.
 */

export type AgentPersonaId = "front_desk" | "booking_specialist" | "knowledge_guide";
export type AgentVoiceId = "eric" | "sarah" | "george";
export type AgentPaceId = "patient" | "normal" | "eager";
export type AgentLanguageId = "en" | "es" | "fr";
export type AgentSurfaceId = "chat" | "voice" | "both";

export type AgentConfigureDraft = {
  persona: AgentPersonaId;
  voice: AgentVoiceId;
  pace: AgentPaceId;
  language: AgentLanguageId;
  surface: AgentSurfaceId;
  greetingId: string;
  customGreeting?: string;
};

export const FREE_PLAN_PERSONAS: Array<{
  id: AgentPersonaId;
  label: string;
  hint: string;
  guidance: string;
}> = [
  {
    id: "front_desk",
    label: "Friendly front desk",
    hint: "Warm greetings, general questions, light booking help",
    guidance:
      "Be a warm front-desk concierge. Greet visitors, answer common questions briefly, and help them book when ready.",
  },
  {
    id: "booking_specialist",
    label: "Booking specialist",
    hint: "Focus on availability, times, and confirmations",
    guidance:
      "Prioritize booking: confirm the service, date, and time quickly. Use tools before guessing availability.",
  },
  {
    id: "knowledge_guide",
    label: "Knowledge guide",
    hint: "Policies, FAQs, and published business info first",
    guidance:
      "Lead with published knowledge and business info. Offer to book only after the visitor’s question is answered.",
  },
];

/** Stock library voices available without cloning (Free plan). */
export const FREE_PLAN_VOICES: Array<{
  id: AgentVoiceId;
  label: string;
  hint: string;
  elevenLabsVoiceId: string;
}> = [
  {
    id: "eric",
    label: "Eric",
    hint: "Clear and professional",
    elevenLabsVoiceId: "cjVigY5qzO86Huf0OWal",
  },
  {
    id: "sarah",
    label: "Sarah",
    hint: "Friendly and natural",
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
  },
  {
    id: "george",
    label: "George",
    hint: "Warm and conversational",
    elevenLabsVoiceId: "JBFqnCBsd6RMkjVDRZzb",
  },
];

export const FREE_PLAN_PACES: Array<{
  id: AgentPaceId;
  label: string;
  hint: string;
}> = [
  {
    id: "patient",
    label: "Patient",
    hint: "Waits longer before speaking — good for careful callers",
  },
  {
    id: "normal",
    label: "Normal",
    hint: "Balanced turn-taking (ElevenLabs default)",
  },
  {
    id: "eager",
    label: "Eager",
    hint: "Responds quickly — snappy chat feel",
  },
];

export const FREE_PLAN_LANGUAGES: Array<{
  id: AgentLanguageId;
  label: string;
  hint: string;
}> = [
  { id: "en", label: "English", hint: "Primary free-plan language" },
  { id: "es", label: "Spanish", hint: "Multilingual (Free includes)" },
  { id: "fr", label: "French", hint: "Multilingual (Free includes)" },
];

export const FREE_PLAN_SURFACES: Array<{
  id: AgentSurfaceId;
  label: string;
  hint: string;
  requires: Array<"web_agent" | "browser_voice">;
}> = [
  {
    id: "chat",
    label: "Text chat Orb",
    hint: "Website widget / text concierge (Pro+)",
    requires: ["web_agent"],
  },
  {
    id: "voice",
    label: "Browser audio",
    hint: "Microphone conversations (Pro)",
    requires: ["browser_voice"],
  },
  {
    id: "both",
    label: "Chat + browser audio",
    hint: "Both channels when your plan includes them",
    requires: ["web_agent", "browser_voice"],
  },
];

export const FREE_PLAN_GREETINGS: Array<{
  id: string;
  label: string;
  template: string;
}> = [
  {
    id: "welcome",
    label: "Classic welcome",
    template: "Hello! Welcome to {{business_name}}. How can I help today?",
  },
  {
    id: "book",
    label: "Booking-first",
    template:
      "Hi — I can help you book with {{business_name}}. What are you looking for?",
  },
  {
    id: "short",
    label: "Short & open",
    template: "Hi from {{business_name}}! What can I do for you?",
  },
];

/** Free-tier friendly LLM — no custom endpoint. */
export const FREE_PLAN_LLM = "gemini-2.5-flash";

export const DEFAULT_AGENT_CONFIGURE: AgentConfigureDraft = {
  persona: "front_desk",
  voice: "eric",
  pace: "normal",
  language: "en",
  surface: "chat",
  greetingId: "welcome",
};

export function resolveGreeting(
  draft: AgentConfigureDraft,
  businessName: string,
): string {
  if (draft.greetingId === "custom" && draft.customGreeting?.trim()) {
    return draft.customGreeting.trim().slice(0, 500);
  }
  const preset =
    FREE_PLAN_GREETINGS.find((item) => item.id === draft.greetingId) ??
    FREE_PLAN_GREETINGS[0];
  return preset.template.replaceAll("{{business_name}}", businessName);
}

export function resolveVoiceId(voice: AgentVoiceId): string {
  return (
    FREE_PLAN_VOICES.find((item) => item.id === voice)?.elevenLabsVoiceId ??
    FREE_PLAN_VOICES[0].elevenLabsVoiceId
  );
}

export function resolvePersonaGuidance(persona: AgentPersonaId): string {
  return (
    FREE_PLAN_PERSONAS.find((item) => item.id === persona)?.guidance ??
    FREE_PLAN_PERSONAS[0].guidance
  );
}

export type SessionAgentOverrides = {
  agent?: {
    firstMessage?: string;
    language?: AgentLanguageId;
  };
  tts?: {
    voiceId?: string;
  };
  turn?: {
    turnEagerness?: AgentPaceId;
  };
};

function resolveSessionLanguage(
  language?: string | null,
): AgentLanguageId | undefined {
  if (language === "en" || language === "es" || language === "fr") {
    return language;
  }
  return undefined;
}

export function buildSessionOverrides(args: {
  welcomeMessage: string;
  language?: string | null;
  voiceId?: string | null;
  pace?: string | null;
}): SessionAgentOverrides {
  const language = resolveSessionLanguage(args.language);
  return {
    agent: {
      firstMessage: args.welcomeMessage,
      ...(language ? { language } : {}),
    },
    tts: {
      ...(args.voiceId ? { voiceId: args.voiceId } : {}),
    },
    turn: {
      ...(args.pace === "patient" ||
      args.pace === "normal" ||
      args.pace === "eager"
        ? { turnEagerness: args.pace }
        : {}),
    },
  };
}
