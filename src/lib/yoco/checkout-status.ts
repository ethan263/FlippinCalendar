export type YocoCheckoutStatus = {
  id: string;
  status: string;
  paymentId: string | null;
  amount: number | null;
  processingMode: string | null;
  metadata: Record<string, string> | null;
};

export function checkoutIndicatesPayment(checkout: YocoCheckoutStatus): boolean {
  if (checkout.paymentId) return true;
  const status = checkout.status.toLowerCase();
  return (
    status === "completed" ||
    status === "complete" ||
    status === "paid" ||
    status === "succeeded"
  );
}

export function checkoutIndicatesFailure(checkout: YocoCheckoutStatus): boolean {
  const status = checkout.status.toLowerCase();
  return (
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "expired"
  );
}
