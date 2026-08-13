import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div>
      <PageHeader
        title="Board Sign-Up"
        subtitle="Create an account, then wait for an owner to approve you as admin."
      />
      <div className="mx-auto max-w-md px-4 py-12">
        <form action={signup} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          {error && (
            <p className="rounded-lg bg-pink/10 px-3 py-2 text-sm font-semibold text-pink">
              {error}
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
            Full Name
            <input
              type="text"
              name="full_name"
              required
              className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-full bg-orange px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Create Account
          </button>
          <p className="text-center text-sm text-navy/60">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-teal">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
