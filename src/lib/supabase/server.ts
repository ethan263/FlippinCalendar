import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.",
    );
  }

  const { getToken } = await auth();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: async () => (await cookies()).getAll(),
      setAll: async () => {
        // Clerk owns auth cookies; Supabase cookie writes are not needed here.
      },
    },
    accessToken: async () => (await getToken()) ?? null,
  });
}
