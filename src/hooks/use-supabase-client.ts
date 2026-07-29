"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Browser Supabase client that forwards Clerk session tokens for RLS.
 * Dashboard server actions currently use the service-role client after Clerk
 * verification; use this hook when adding direct client reads/writes.
 */
export function useSupabaseClient() {
  const { getToken, isLoaded } = useAuth();

  return useMemo(
    () =>
      createClient(async () => {
        if (!isLoaded) return null;
        return (await getToken()) ?? null;
      }),
    [getToken, isLoaded],
  );
}
