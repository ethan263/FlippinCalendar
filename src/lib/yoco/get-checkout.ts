import "server-only";

import type { YocoCheckoutStatus } from "@/lib/yoco/checkout-status";

export type { YocoCheckoutStatus } from "@/lib/yoco/checkout-status";
export {
  checkoutIndicatesFailure,
  checkoutIndicatesPayment,
} from "@/lib/yoco/checkout-status";

export async function getYocoCheckout(
  checkoutId: string,
): Promise<YocoCheckoutStatus> {
  const secretKey = process.env.YOCO_CHECKOUT_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("YOCO_CHECKOUT_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `https://payments.yoco.com/api/checkouts/${encodeURIComponent(checkoutId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Yoco checkout lookup failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    paymentId?: string | null;
    processingMode?: string | null;
    metadata?: Record<string, string> | null;
  };

  if (!data.id || !data.status) {
    throw new Error("Yoco checkout response missing id or status.");
  }

  return {
    id: data.id,
    status: data.status,
    paymentId: data.paymentId ?? null,
    processingMode: data.processingMode ?? null,
    metadata: data.metadata ?? null,
  };
}
