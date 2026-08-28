import "server-only";

import { getPayfastCredentials, getPayfastValidateUrl } from "./config";
import { verifyPayfastSignature } from "./signature";

export type PayfastItnPayload = Record<string, string>;

export function parsePayfastItnFormData(formData: FormData): PayfastItnPayload {
  const data: PayfastItnPayload = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });
  return data;
}

export function verifyPayfastItnSignature(data: PayfastItnPayload): void {
  const { passphrase } = getPayfastCredentials();
  if (!verifyPayfastSignature(data, passphrase || undefined)) {
    throw new Error("Invalid PayFast ITN signature.");
  }
}

/** Re-post ITN body to PayFast validate endpoint; must return VALID. */
export async function validatePayfastItnWithProvider(
  data: PayfastItnPayload,
): Promise<void> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    body.append(key, value);
  }

  const response = await fetch(getPayfastValidateUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = (await response.text()).trim();
  if (!response.ok || text !== "VALID") {
    throw new Error(`PayFast ITN validation failed: ${text || response.status}`);
  }
}
