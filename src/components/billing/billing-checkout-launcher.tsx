"use client";

import { CheckoutButton } from "@clerk/nextjs/experimental";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import type { ClerkPlanSlug } from "@/lib/marketing/plans";

type BillingCheckoutLauncherProps = {
  planSlug: ClerkPlanSlug;
  redirectUrl: string;
};

export function BillingCheckoutLauncher({
  planSlug,
  redirectUrl,
}: BillingCheckoutLauncherProps) {
  const { isLoaded, orgId } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !orgId || openedRef.current) {
      return;
    }

    openedRef.current = true;
    buttonRef.current?.click();
  }, [isLoaded, orgId]);

  if (planSlug === "free_org") {
    return null;
  }

  return (
    <CheckoutButton
      planId={planSlug}
      planPeriod="month"
      for="organization"
      newSubscriptionRedirectUrl={redirectUrl}
    >
      <button
        ref={buttonRef}
        type="button"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      >
        Open checkout
      </button>
    </CheckoutButton>
  );
}
