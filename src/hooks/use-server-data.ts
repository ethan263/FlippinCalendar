"use client";

import { useEffect, useRef, useState } from "react";

function depsToKey(deps: unknown[]) {
  try {
    return JSON.stringify(deps);
  } catch {
    // Fall back so the hook still works for non-serializable deps.
    return String(deps.length);
  }
}

type UseServerDataOptions = {
  /** When false, skip the loader and return undefined (avoids bootstrap races). */
  enabled?: boolean;
};

/** Convex-compatible loading sentinel: undefined until the first successful load. */
export function useServerData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options?: UseServerDataOptions,
): T | undefined {
  const enabled = options?.enabled ?? true;
  const depsKey = `${depsToKey(deps)}:${enabled ? "1" : "0"}`;
  const [cache, setCache] = useState<{ key: string; data: T | undefined }>({
    key: depsKey,
    data: undefined,
  });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // Reset to the loading sentinel when deps change (React "adjust state during render").
  if (cache.key !== depsKey) {
    setCache({ key: depsKey, data: undefined });
  }

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const requestKey = depsKey;
    void loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setCache({ key: requestKey, data: result });
      })
      .catch((error) => {
        console.error(error);
        // Keep prior successful data for this key when a refresh fails so the
        // UI does not look permanently stuck in a loading state.
        if (!cancelled) {
          setCache((previous) =>
            previous.key === requestKey && previous.data !== undefined
              ? previous
              : { key: requestKey, data: undefined },
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [depsKey, enabled]);

  return cache.key === depsKey ? cache.data : undefined;
}
