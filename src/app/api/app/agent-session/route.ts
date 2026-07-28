import { auth } from "@clerk/nextjs/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { createAgentDynamicVariables } from "@/lib/agent-context";
import { listRules } from "@/lib/data/availability";
import { getCurrentAgent } from "@/lib/data/agents";
import { listOfferings } from "@/lib/data/catalog";
import { listKnowledge } from "@/lib/data/knowledge";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { resolveElevenLabsAgentId } from "@/lib/elevenlabs/config";
import { getCurrentDraft } from "@/lib/data/public-site";
import { DEFAULT_TERMINOLOGY } from "@/lib/data/shared";

export const runtime = "nodejs";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function weeklyHoursFromRules(
  rules: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    active: boolean;
  }>,
) {
  const hoursByDay = new Map<
    number,
    Array<{ startMinute: number; endMinute: number }>
  >();
  for (const rule of rules) {
    if (!rule.active) continue;
    const ranges = hoursByDay.get(rule.dayOfWeek) ?? [];
    const exists = ranges.some(
      (range) =>
        range.startMinute === rule.startMinute &&
        range.endMinute === rule.endMinute,
    );
    if (!exists) {
      ranges.push({
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
      });
      hoursByDay.set(rule.dayOfWeek, ranges);
    }
  }

  return [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => hoursByDay.has(day))
    .map((day) => ({
      label: DAY_LABELS[day] ?? `Day ${day}`,
      ranges: (hoursByDay.get(day) ?? []).sort(
        (a, b) => a.startMinute - b.startMinute,
      ),
    }));
}

export async function POST() {
  const { has, isAuthenticated, orgId } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!has({ feature: "browser_voice" })) {
    return NextResponse.json(
      { error: "This organization’s plan does not include browser audio." },
      { status: 403 },
    );
  }
  if (
    !has({ permission: "org:operations_hub:manage" }) &&
    !has({ role: "org:admin" }) &&
    !has({ role: "org:owner" })
  ) {
    return NextResponse.json(
      { error: "Organization operator access is required." },
      { status: 403 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const agentId = resolveElevenLabsAgentId();
  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "The agent test is not configured." },
      { status: 503 },
    );
  }

  try {
    const [organization, agent, site, offerings, knowledgeItems, rules] =
      await Promise.all([
        getCurrentOrganization(),
        getCurrentAgent(),
        getCurrentDraft(),
        listOfferings({ includeInactive: false }),
        listKnowledge({ includeUnpublished: false }),
        listRules(),
      ]);

    if (
      !organization ||
      organization.clerkOrgId !== orgId ||
      !agent.integration?.webEnabled
    ) {
      return NextResponse.json(
        { error: "No web agent is connected to this organization." },
        { status: 404 },
      );
    }

    const elevenlabs = new ElevenLabsClient({ apiKey });
    const { signedUrl } =
      await elevenlabs.conversationalAi.conversations.getSignedUrl({
        agentId,
      });

    const weeklyHours = weeklyHoursFromRules(rules);

    return NextResponse.json(
      {
        signedUrl,
        dynamicVariables: createAgentDynamicVariables({
          siteSlug: site.site.siteSlug,
          businessName: site.site.draft.businessName,
          description: site.site.draft.about,
          timezone: organization.timezone,
          locale: organization.locale,
          currency: organization.currency,
          terminology: {
            ...DEFAULT_TERMINOLOGY,
            ...organization.terminology,
          },
          offerings,
          knowledgeItems,
          weeklyHours,
          organizationId: organization._id,
          externalUserId: organization.clerkOrgId,
          textChatEnabled: Boolean(has({ feature: "web_agent" })),
          voiceChatEnabled: true,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to start authenticated ElevenLabs agent test", error);
    return NextResponse.json(
      { error: "The agent test is unavailable right now." },
      { status: 500 },
    );
  }
}
