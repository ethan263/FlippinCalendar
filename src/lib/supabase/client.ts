import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function createClient(
  getToken?: () => Promise<string | null | undefined>,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.",
    );
  }

  if (!getToken) {
    if (!browserClient) {
      browserClient = createBrowserClient(url, publishableKey);
    }
    return browserClient;
  }

  return createBrowserClient(url, publishableKey, {
    accessToken: async () => (await getToken()) ?? null,
  });
}
