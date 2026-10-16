import { createClient } from "@supabase/supabase-js";

/**
 * Read-only database client for public pages. It doesn't look at login
 * cookies, which lets Next.js cache public pages instead of rebuilding them
 * on every visit. Database security rules still apply (visitors can only
 * read what's public).
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
