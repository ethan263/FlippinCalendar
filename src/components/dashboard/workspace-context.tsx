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
import { useAuth, useOrganization } from "@clerk/nextjs";

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
  bootstrapError: string | null;
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
  const { isLoaded, orgId } = useAuth();
  const { organization: clerkOrganization } = useOrganization();
  const [organization, setOrganization] = useState<Organization | null | undefined>(
    undefined,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const requestedBootstrap = useRef(false);
  const hadOrganization = useRef(false);
  const loadedOrgSlug = useRef<string | null>(null);

  const refreshOrganization = useCallback(async () => {
    const current = await fetchCurrentOrganizationAction(orgSlug);
    setOrganization(current);
  }, [orgSlug]);

  useEffect(() => {
    if (organization) {
      hadOrganization.current = true;
    }
  }, [organization]);

  useEffect(() => {
    // Prefer session orgId from useAuth — useOrganization() can lag behind the
    // active Clerk session even when the server layout already resolved orgSlug.
    if (!isLoaded) return;

    requestedBootstrap.current = false;

    if (!orgId) {
      // Clerk can briefly clear orgId during server-action transitions (e.g.
      // starting Yoco checkout). Do not replace a loaded workspace with a false
      // sync error while that happens.
      if (!hadOrganization.current) {
        setOrganization(null);
        setBootstrapError("Select a business to continue.");
      }
      return;
    }

    // Already synced for this route — skip refetch during transient orgId flicker.
    if (loadedOrgSlug.current === orgSlug && hadOrganization.current) {
      return;
    }

    let cancelled = false;
    if (loadedOrgSlug.current !== orgSlug) {
      setOrganization(undefined);
    }
    setBootstrapError(null);
    void fetchCurrentOrganizationAction(orgSlug)
      .then((current) => {
        if (!cancelled) {
          setOrganization(current);
          if (current) {
            loadedOrgSlug.current = orgSlug;
            hadOrganization.current = true;
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOrganization(null);
          setBootstrapError(
            error instanceof Error ? error.message : "Failed to load business.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, orgId, orgSlug]);

  useEffect(() => {
    if (
      !isLoaded ||
      !orgId ||
      organization !== null ||
      requestedBootstrap.current
    ) {
      return;
    }

    requestedBootstrap.current = true;
    setIsCreating(true);
    setBootstrapError(null);
    void bootstrapCurrentOrganizationAction({
      name: clerkOrganization?.name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
    })
      .then((created) => {
        setOrganization(created);
        setBootstrapError(null);
      })
      .catch((error) => {
        requestedBootstrap.current = false;
        setBootstrapError(
          error instanceof Error
            ? error.message
            : "Failed to set up business.",
        );
      })
      .finally(() => setIsCreating(false));
  }, [clerkOrganization?.name, isLoaded, orgId, organization, orgSlug]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      orgSlug,
      // Keep null only when bootstrapping is finished and no org exists.
      // While loading (undefined), expose null AND isBootstrapping=true so
      // consumers can skip server actions until the workspace is ready.
      organization: organization ?? null,
      terminology: organization
        ? normalizeTerminology(organization.terminology)
        : defaultTerminology,
      isBootstrapping: organization === undefined || isCreating,
      bootstrapError,
      refreshOrganization,
    }),
    [bootstrapError, isCreating, organization, orgSlug, refreshOrganization],
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
