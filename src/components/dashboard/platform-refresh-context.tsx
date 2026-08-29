"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PlatformRefreshContextValue = {
  draftVersion: number;
  entitlementsVersion: number;
  refreshDraft: () => void;
  refreshEntitlementsState: () => void;
};

const PlatformRefreshContext =
  createContext<PlatformRefreshContextValue | null>(null);

export function PlatformRefreshProvider({ children }: { children: ReactNode }) {
  const [draftVersion, setDraftVersion] = useState(0);
  const [entitlementsVersion, setEntitlementsVersion] = useState(0);
  const refreshDraft = useCallback(() => {
    setDraftVersion((value) => value + 1);
  }, []);
  const refreshEntitlementsState = useCallback(() => {
    setEntitlementsVersion((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({
      draftVersion,
      entitlementsVersion,
      refreshDraft,
      refreshEntitlementsState,
    }),
    [draftVersion, entitlementsVersion, refreshDraft, refreshEntitlementsState],
  );

  return (
    <PlatformRefreshContext.Provider value={value}>
      {children}
    </PlatformRefreshContext.Provider>
  );
}

export function usePlatformRefresh() {
  const value = useContext(PlatformRefreshContext);
  if (!value) {
    throw new Error(
      "usePlatformRefresh must be used inside PlatformRefreshProvider",
    );
  }
  return value;
}
