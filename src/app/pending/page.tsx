import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/signout/actions";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin");

  return (
    <div>
      <PageHeader title="Almost There" />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-navy">
            Your account is created and waiting on approval.
          </p>
          <p className="mt-2 text-sm text-navy/70">
            An existing admin needs to approve your account before you can access
            the board dashboard. Check back soon, or reach out to a current board
            member to let them know you signed up.
          </p>
          <form action={signout} className="mt-6">
            <button
              type="submit"
              className="rounded-full border-2 border-navy px-6 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
