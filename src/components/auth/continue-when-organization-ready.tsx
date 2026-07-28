"use client";

import { useEffect } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";

/**
 * When Membership required leaves the session `pending` after an org is
 * already selected, SignIn's choose-organization task can get stuck. If we
 * already have an org, continue into the app.
 */
export function ContinueWhenOrganizationReady() {
  const { isLoaded, orgSlug } = useAuth({ treatPendingAsSignedOut: false });
  const { organization } = useOrganization();

  useEffect(() => {
    if (!isLoaded) return;
    const slug = orgSlug ?? organization?.slug;
    if (!slug) return;
    if (!window.location.pathname.includes("/tasks/choose-organization")) {
      return;
    }
    window.location.replace(`/app/${slug}`);
  }, [isLoaded, orgSlug, organization?.slug]);

  return null;
}
