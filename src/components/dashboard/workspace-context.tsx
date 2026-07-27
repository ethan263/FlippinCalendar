"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOrganization } from "@clerk/nextjs";

import {
  defaultTerminology,
  normalizeTerminology,
  type Organization,
  type Terminology,
} from "@/components/dashboard/data";
import {
  bootstrapCurrentOrganizationAction,
  fetchCurrentOrganizationAction,
} from "@/app/actions/organizations";

type WorkspaceContextValue = {
  orgSlug: string;
  organization: Organization | null;
  terminology: Terminology;
  isBootstrapping: boolean;
  refreshOrganization: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  const { organization: clerkOrganization, isLoaded } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null | undefined>(
    undefined,
  );
  const [isCreating, setIsCreating] = useState(false);
  const requestedBootstrap = useRef(false);

  const refreshOrganization = useCallback(async () => {
    const current = await fetchCurrentOrganizationAction();
    setOrganization(current);
  }, []);

  useEffect(() => {
    if (!isLoaded || !clerkOrganization) return;
    let cancelled = false;
    void fetchCurrentOrganizationAction()
      .then((current) => {
        if (!cancelled) setOrganization(current);
      })
      .catch(() => {
        if (!cancelled) setOrganization(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkOrganization, isLoaded, orgSlug]);

  useEffect(() => {
    if (
      !isLoaded ||
      !clerkOrganization ||
      organization !== null ||
      requestedBootstrap.current
    ) {
      return;
    }

    requestedBootstrap.current = true;
    setIsCreating(true);
    void bootstrapCurrentOrganizationAction({
      name: clerkOrganization.name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
    })
      .then((created) => setOrganization(created))
      .catch(() => {
        requestedBootstrap.current = false;
      })
      .finally(() => setIsCreating(false));
  }, [clerkOrganization, isLoaded, organization, orgSlug]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      orgSlug,
      organization: organization ?? null,
      terminology: organization
        ? normalizeTerminology(organization.terminology)
        : defaultTerminology,
      isBootstrapping: organization === undefined || isCreating,
      refreshOrganization,
    }),
    [isCreating, organization, orgSlug, refreshOrganization],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
