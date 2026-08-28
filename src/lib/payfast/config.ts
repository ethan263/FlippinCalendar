import "server-only";

export type PayfastMode = "sandbox" | "live";

export function getPayfastMode(): PayfastMode {
  const mode = process.env.PAYFAST_MODE?.trim().toLowerCase();
  return mode === "live" ? "live" : "sandbox";
}

export function getPayfastProcessUrl(): string {
  return getPayfastMode() === "live"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
}

export function getPayfastValidateUrl(): string {
  return getPayfastMode() === "live"
    ? "https://www.payfast.co.za/eng/query/validate"
    : "https://sandbox.payfast.co.za/eng/query/validate";
}

export function getPayfastCredentials() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim() ?? "";

  if (!merchantId || !merchantKey) {
    throw new Error(
      "PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be configured.",
    );
  }

  return { merchantId, merchantKey, passphrase };
}
