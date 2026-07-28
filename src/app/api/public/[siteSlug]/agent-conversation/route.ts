import { NextRequest, NextResponse } from "next/server";

import { recordPublicConversation } from "@/lib/data/agents";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  const body = (await request.json().catch(() => null)) as {
    conversationId?: unknown;
  } | null;
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId.trim() : "";

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required." },
      { status: 400 },
    );
  }

  try {
    const conversation = await recordPublicConversation({
      siteSlug,
      conversationId,
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation could not be recorded for this site." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: true, conversationId: conversation.externalConversationId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to record conversation.";
    console.error("Unable to record public agent conversation", {
      siteSlug,
      error,
    });
    return NextResponse.json(
      { error: message },
      { status: message.includes("valid conversation") ? 400 : 500 },
    );
  }
}
