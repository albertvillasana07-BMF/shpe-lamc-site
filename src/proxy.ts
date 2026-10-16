import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// Only check logins on pages that need it. Public pages skip this,
// which saves a trip to the database on every visit.
export const config = {
  matcher: [
    "/admin/:path*",
    "/login/:path*",
    "/signup",
    "/pending",
    "/reset-password",
    "/auth/:path*",
  ],
};
