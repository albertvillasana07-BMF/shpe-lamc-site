import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { buildIcs } from "@/lib/eventCalendar";
import type { EventRow } from "@/lib/types";

export async function GET(req: NextRequest, ctx: RouteContext<"/events/[id]/ics">) {
  const { id } = await ctx.params;
  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).single();
  const event = data as EventRow | null;

  const ics = event ? buildIcs(event, req.nextUrl.origin) : null;
  if (!event || !ics) return new Response("Event not found", { status: 404 });

  const filename = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.ics"`,
    },
  });
}
