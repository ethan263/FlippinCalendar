import { NextResponse } from "next/server";

import { createYocoCheckoutAction } from "@/app/actions/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { planKey?: string };
  try {
    body = (await request.json()) as { planKey?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const planKey = body.planKey?.trim();
  if (!planKey) {
    return NextResponse.json({ error: "planKey is required." }, { status: 400 });
  }

  try {
    const result = await createYocoCheckoutAction(planKey);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    const status = message.includes("Too many checkout") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
