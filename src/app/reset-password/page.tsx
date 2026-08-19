import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const linkError = user
    ? null
    : "This reset link is invalid or has expired. Request a new one.";

  return (
    <div>
      <PageHeader title="Set a new password" subtitle="Choose a new password for your account." />
      <div className="mx-auto max-w-md px-4 py-12">
        {linkError ? (
          <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-pink">{linkError}</p>
            <a href="/login/forgot-password" className="mt-4 inline-block text-sm font-bold text-teal">
              Request a new reset link
            </a>
          </div>
        ) : (
          <form
            action={updatePassword}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-8 shadow-sm"
          >
            {error && (
              <p className="rounded-lg bg-pink/10 px-3 py-2 text-sm font-semibold text-pink">
                {error}
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
              New password
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
              Confirm new password
              <input
                type="password"
                name="confirm"
                required
                minLength={6}
                className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-orange px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}