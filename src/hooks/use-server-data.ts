"use client";

import { useEffect, useState } from "react";

/** Convex-compatible loading sentinel: undefined until the first successful load. */
export function useServerData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
): T | undefined {
  const depsKey = JSON.stringify(deps);
  const [cache, setCache] = useState<{ key: string; data: T | undefined }>({
    key: depsKey,
    data: undefined,
  });

  // Reset to the loading sentinel when deps change (React "adjust state during render").
  if (cache.key !== depsKey) {
    setCache({ key: depsKey, data: undefined });
  }

  useEffect(() => {
    let cancelled = false;
    void loader()
      .then((result) => {
        if (!cancelled) setCache({ key: depsKey, data: result });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setCache({ key: depsKey, data: undefined });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps);

  return cache.key === depsKey ? cache.data : undefined;
}
