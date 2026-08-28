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
  refreshDraft: () => void;
};

const PlatformRefreshContext =
  createContext<PlatformRefreshContextValue | null>(null);

export function PlatformRefreshProvider({ children }: { children: ReactNode }) {
  const [draftVersion, setDraftVersion] = useState(0);
  const refreshDraft = useCallback(() => {
    setDraftVersion((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({ draftVersion, refreshDraft }),
    [draftVersion, refreshDraft],
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
