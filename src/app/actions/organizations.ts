"use server";

import {
  bootstrapCurrentOrganization,
  getCurrentOrganization,
  getOrganizationForRouteSlug,
  updateCurrentOrganization,
} from "@/lib/data/organizations";
import type { BackendTerminology } from "@/lib/data/shared";

export async function fetchCurrentOrganizationAction(orgSlug?: string) {
  const routeOrgSlug = orgSlug?.trim();
  if (routeOrgSlug) {
    return getOrganizationForRouteSlug(routeOrgSlug);
  }
  return getCurrentOrganization();
}

export async function bootstrapCurrentOrganizationAction(args: {
  name?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
}) {
  return bootstrapCurrentOrganization(args);
}

export async function updateCurrentOrganizationAction(args: {
  name?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  terminology?: BackendTerminology;
}) {
  return updateCurrentOrganization(args);
}
