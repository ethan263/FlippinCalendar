import { createHash } from "node:crypto";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextRequest, NextResponse } from "next/server";

import { createAgentDynamicVariables } from "@/lib/agent-context";
import { organizationHasFeatureByOrganizationId } from "@/lib/billing/subscriptions";
import {
  consumePublicSessionRateLimit,
  releasePublicSessionRateLimit,
  requestPublicSession,
} from "@/lib/data/agents";
import { resolveElevenLabsAgentId } from "@/lib/elevenlabs/config";
import {
  buildSessionOverrides,
  resolvePersonaGuidance,
  resolveVoiceId,
  type AgentPersonaId,
  type AgentVoiceId,
} from "@/lib/elevenlabs/free-plan-presets";
import { getPublishedBySlug } from "@/lib/data/public-site";
import { DEFAULT_TERMINOLOGY } from "@/lib/data/shared";

export const runtime = "nodejs";

function clientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${address}|${agent}`).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
  } | null;
  const mode = body?.mode;

  if (mode !== "text" && mode !== "voice" && mode !== "widget") {
    return NextResponse.json(
      { error: "Choose text chat, browser audio, or the ElevenLabs widget." },
      { status: 400 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "The concierge is not configured." },
      { status: 503 },
    );
  }

  try {
    const sessionConfig = await requestPublicSession({
      siteSlug,
      mode,
    });

    if (!sessionConfig) {
      return NextResponse.json(
        { error: "The concierge is not enabled for this page." },
        { status: 404 },
      );
    }

    const agentId = resolveElevenLabsAgentId(sessionConfig.webAgentId);
    if (!agentId) {
      return NextResponse.json(
        { error: "The concierge is not configured." },
        { status: 503 },
      );
    }

    const [textEntitled, voiceEntitled, published] = await Promise.all([
      organizationHasFeatureByOrganizationId(
        sessionConfig.organizationId,
        "web_agent",
      ),
      organizationHasFeatureByOrganizationId(
        sessionConfig.organizationId,
        "browser_voice",
      ),
      getPublishedBySlug(sessionConfig.siteSlug),
    ]);

    const requiredFeature = mode === "text" ? "web_agent" : "browser_voice";
    const entitled = mode === "text" ? textEntitled : voiceEntitled;
    if (!entitled) {
      return NextResponse.json(
        {
          error:
            requiredFeature === "web_agent"
              ? "This organization’s plan does not include AI text chat."
              : "This organization’s plan does not include browser audio.",
        },
        { status: 402 },
      );
    }

    if (!published) {
      return NextResponse.json(
        { error: "This public page is unavailable." },
        { status: 404 },
      );
    }

    // Fail closed: never mint a session when published toggles disagree with mode.
    const agentToggles = published.site.config.agent;
    const toggleOk =
      mode === "text"
        ? agentToggles.showWebChat
        : mode === "voice"
          ? agentToggles.showVoiceChat
          : agentToggles.showElevenLabsWidget;
    if (!toggleOk) {
      return NextResponse.json(
        { error: "The concierge is not enabled for this page." },
        { status: 404 },
      );
    }

    const rateLimitConsumption = await consumePublicSessionRateLimit({
      organizationId: sessionConfig.organizationId,
      publicSiteId: sessionConfig.publicSiteId,
      clientKey: clientKey(request),
    });

    const elevenlabs = new ElevenLabsClient({ apiKey });
    let signedUrl: string;
    try {
      const session = await elevenlabs.conversationalAi.conversations.getSignedUrl({
        agentId,
      });
      signedUrl = session.signedUrl;
    } catch (elError) {
      await releasePublicSessionRateLimit(rateLimitConsumption);
      throw elError;
    }

    // Signed URL only — never return the API key or raw agent id to the browser.
    const agentConfig = published.site.config.agent;
    const voicePreset = agentConfig.voicePreset as AgentVoiceId | undefined;
    const persona = agentConfig.persona as AgentPersonaId | undefined;

    return NextResponse.json(
      {
        signedUrl,
        dynamicVariables: createAgentDynamicVariables({
          siteSlug: published.site.siteSlug,
          businessName: published.site.config.businessName,
          description: published.site.config.about,
          timezone: published.organization.timezone,
          locale: published.organization.locale,
          currency: published.organization.currency,
          terminology: {
            ...DEFAULT_TERMINOLOGY,
            ...published.organization.terminology,
          },
          offerings: published.offerings,
          knowledgeItems: published.knowledgeItems,
          weeklyHours: published.weeklyHours,
          organizationId: published.organization.id,
          externalUserId:
            published.organization.clerkOrgId ?? published.organization.id,
          textChatEnabled: textEntitled,
          voiceChatEnabled: voiceEntitled,
          personaGuidance: persona
            ? resolvePersonaGuidance(persona)
            : undefined,
        }),
        overrides: buildSessionOverrides({
          welcomeMessage: agentConfig.welcomeMessage,
          language: agentConfig.language,
          voiceId: voicePreset ? resolveVoiceId(voicePreset) : null,
          pace: agentConfig.turnEagerness,
        }),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const rateLimited = message.includes("Too many concierge sessions");
    console.error("Unable to create ElevenLabs public session", {
      siteSlug,
      error,
    });
    return NextResponse.json(
      {
        error: rateLimited
          ? "Too many concierge sessions. Please wait a moment and try again."
          : "The concierge is unavailable right now.",
      },
      { status: rateLimited ? 429 : 500 },
    );
  }
}
