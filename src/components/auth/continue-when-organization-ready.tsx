"use client";

import { useEffect, useRef } from "react";
import { useAuth, useClerk, useOrganization, useOrganizationList } from "@clerk/nextjs";

/**
 * When Membership required leaves the session `pending` after an org is
 * already selected, choose-organization can get stuck. If a membership
 * exists (or an org is already active), activate it and enter /app even
 * while the session task is still pending — middleware + requireAppSession
 * treat pending as signed-in when a userId is present.
 */
export function ContinueWhenOrganizationReady() {
  const { isLoaded, orgSlug, orgId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const { organization } = useOrganization();
  const { setActive, session } = useClerk();
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const activatingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !orgsLoaded) return;
    if (!window.location.pathname.includes("/tasks/choose-organization")) {
      return;
    }

    const membership = userMemberships.data?.[0];
    const slug =
      orgSlug ??
      organization?.slug ??
      membership?.organization.slug ??
      null;

    if (!slug) return;

    const hasActiveOrg =
      Boolean(orgId) ||
      Boolean(organization?.id) ||
      Boolean(session?.lastActiveOrganizationId);

    const enterApp = () => {
      window.location.replace(`/app/${slug}`);
    };

    if (hasActiveOrg) {
      enterApp();
      return;
    }

    if (!membership || activatingRef.current) return;

    activatingRef.current = true;
    void setActive({ organization: membership.organization.id })
      .then(() => {
        enterApp();
      })
      .catch(() => {
        activatingRef.current = false;
      });
  }, [
    isLoaded,
    orgsLoaded,
    orgSlug,
    orgId,
    organization?.id,
    organization?.slug,
    session?.lastActiveOrganizationId,
    setActive,
    userMemberships.data,
  ]);

  return null;
}
