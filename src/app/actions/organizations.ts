"use server";

import {
  bootstrapCurrentOrganization,
  getCurrentOrganization,
  updateCurrentOrganization,
} from "@/lib/data/organizations";
import type { BackendTerminology } from "@/lib/data/shared";

export async function fetchCurrentOrganizationAction() {
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
