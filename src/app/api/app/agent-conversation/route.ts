import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { recordOperatorConversation } from "@/lib/data/agents";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { has, isAuthenticated, orgId } = await auth();
  if (!isAuthenticated || !orgId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
    const conversation = await recordOperatorConversation({ conversationId });
    return NextResponse.json(
      { ok: true, conversationId: conversation.externalConversationId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to record conversation.";
    console.error("Unable to record operator agent conversation", error);
    return NextResponse.json(
      { error: message },
      { status: message.includes("valid conversation") ? 400 : 500 },
    );
  }
}
