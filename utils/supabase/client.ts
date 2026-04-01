import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // During SSG / prerender env vars may be absent — return a
    // harmless stub so the build doesn't crash.
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
