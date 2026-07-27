"use client";

import { useEffect, useState } from "react";

/** Convex-compatible loading sentinel: undefined until the first successful load. */
export function useServerData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    void loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setData(undefined);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps);

  return data;
}
