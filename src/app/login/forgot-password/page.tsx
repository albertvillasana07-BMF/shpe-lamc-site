import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/login/forgot-password">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const sent = params.sent === "1";

  return (
    <div>
      <PageHeader
        title="Reset your password"
        subtitle="We'll email you a link to set a new password."
      />
      <div className="mx-auto max-w-md px-4 py-12">
        {sent ? (
          <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-navy">
              If that email has an account, a reset link is on its way. Check
              your inbox (and spam folder).
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-bold text-teal">
              Back to login
            </Link>
          </div>
        ) : (
          <form
            action={requestPasswordReset}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-8 shadow-sm"
          >
            {error && (
              <p className="rounded-lg bg-pink/10 px-3 py-2 text-sm font-semibold text-pink">
                {error}
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
              Email
              <input
                type="email"
                name="email"
                required
                className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-orange px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Send reset link
            </button>
            <p className="text-center text-sm text-navy/60">
              <Link href="/login" className="font-bold text-teal">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}