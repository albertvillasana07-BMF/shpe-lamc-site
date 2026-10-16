// Runs every Monday morning (8 AM Pacific) on Netlify, for free.
// Finds STEM-related events on lamission.edu and adds them to the
// "Suggested from LAMC" list on /admin/events for a board member to approve.
//
// Needs these environment variables in Netlify (Site configuration → Environment variables):
//   NEXT_PUBLIC_SUPABASE_URL      (already set for the site)
//   SUPABASE_SERVICE_ROLE_KEY     (Supabase → Project Settings → API → service_role key)
import { createClient } from "@supabase/supabase-js";
import { syncLamcEvents } from "../../src/lib/lamcEvents";
import { notifyBoard } from "../../src/lib/notify";

const lamcEventsWeekly = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Missing environment variables", { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const result = await syncLamcEvents(supabase);
  console.log(result.message);
  if (result.added > 0) {
    await notifyBoard(`${result.added} new LAMC event suggestion${result.added === 1 ? "" : "s"}`, [
      result.message,
      "",
      "Approve or dismiss them on the admin Events page.",
    ]);
  }
  return new Response(result.message, { status: result.ok ? 200 : 500 });
};

export default lamcEventsWeekly;

export const config = {
  schedule: "0 15 * * 1",
};
