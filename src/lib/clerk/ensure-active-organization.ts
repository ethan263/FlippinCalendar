"use client";

import { useAuth, useClerk, useOrganization } from "@clerk/nextjs";
import { useCallback } from "react";

/**
 * Ensures Clerk's active organization matches the dashboard route before
 * server actions that require an org claim (billing checkout, etc.).
 */
export function useEnsureActiveOrganization() {
  const { isLoaded, orgId } = useAuth();
  const { organization } = useOrganization();
  const { setActive } = useClerk();

  return useCallback(async () => {
    if (!isLoaded || orgId || !organization?.id) {
      return;
    }

    await setActive({ organization: organization.id });
  }, [isLoaded, orgId, organization?.id, setActive]);
}
