"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  useRefreshableServerData,
  type UseServerDataOptions,
} from "@/hooks/use-server-data";

const DEFAULT_POLL_MS = 30_000;
const REALTIME_DEBOUNCE_MS = 400;

export type LiveTable = "bookings" | "conversations";

export type UseLiveRefreshableServerDataOptions = UseServerDataOptions & {
  /** Poll while the tab is visible. Set to 0 to disable polling. */
  pollIntervalMs?: number;
  /** Supabase tables to watch; any matching row change triggers refresh. */
  liveTables?: readonly LiveTable[];
  organizationId?: string;
};

function liveTablesKey(tables: readonly LiveTable[] | undefined) {
  return tables?.join(",") ?? "";
}

/** Refreshable server data with visibility/focus refresh, optional polling, and Supabase Realtime. */
export function useLiveRefreshableServerData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options?: UseLiveRefreshableServerDataOptions,
) {
  const { data, refresh } = useRefreshableServerData(loader, deps, options);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const organizationId = options?.organizationId;
  const liveTables = options?.liveTables;
  const liveTablesSignature = liveTablesKey(liveTables);
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!enabled) return;

    const refreshNow = () => refreshRef.current();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshNow();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || pollIntervalMs <= 0) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshRef.current();
      }
    }, pollIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, pollIntervalMs]);

  useEffect(() => {
    if (!enabled || !organizationId || !liveTablesSignature || !isLoaded) return;

    const tables = liveTablesSignature.split(",") as LiveTable[];
    const supabase = createClient(async () => (await getToken()) ?? null);
    const channelName = `org-live:${organizationId}:${liveTablesSignature}`;
    let channel = supabase.channel(channelName);
    let debounceId: number | undefined;

    const scheduleRefresh = () => {
      if (debounceId !== undefined) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        refreshRef.current();
      }, REALTIME_DEBOUNCE_MS);
    };

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `organization_id=eq.${organizationId}`,
        },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (debounceId !== undefined) window.clearTimeout(debounceId);
      void supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, liveTablesSignature, isLoaded, getToken]);

  return { data, refresh };
}
