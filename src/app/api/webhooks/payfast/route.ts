import { NextResponse } from "next/server";

import {
  processPayfastPaymentComplete,
  processPayfastPaymentFailed,
} from "@/lib/billing/process-payfast-itn";
import { recordPayfastBillingEvent } from "@/lib/billing/subscriptions";
import {
  parsePayfastItnFormData,
  validatePayfastItnWithProvider,
  verifyPayfastItnSignature,
} from "@/lib/payfast/verify-itn";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const data = parsePayfastItnFormData(formData);

  try {
    verifyPayfastItnSignature(data);
    await validatePayfastItnWithProvider(data);
  } catch (error) {
    console.error("PayFast ITN verification failed", error);
    return new NextResponse("Invalid ITN", { status: 400 });
  }

  const pfPaymentId = data.pf_payment_id?.trim();
  const paymentStatus = data.payment_status?.trim().toUpperCase();
  const mPaymentId = data.m_payment_id?.trim() ?? null;

  if (!pfPaymentId) {
    return new NextResponse("Missing payment id", { status: 400 });
  }

  const isNew = await recordPayfastBillingEvent({
    pfPaymentId,
    mPaymentId,
    eventType: paymentStatus ?? "unknown",
    payload: data,
  });

  let result: Record<string, unknown> = { duplicate: !isNew };

  try {
    if (paymentStatus === "COMPLETE") {
      result = { ...result, ...(await processPayfastPaymentComplete(data)) };
    } else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "CANCELLED"
    ) {
      result = { ...result, ...(await processPayfastPaymentFailed(data)) };
    }
  } catch (error) {
    console.error("PayFast ITN processing failed", error);
    if (isNew) {
      return new NextResponse("Processing failed", { status: 500 });
    }
    return new NextResponse("Duplicate processing failed", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
