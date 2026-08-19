import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div>
      <PageHeader title="Board Login" subtitle="Sign in to the SHPE LAMC admin dashboard." />
      <div className="mx-auto max-w-md px-4 py-12">
        <form action={login} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
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
          <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
            Password
            <input
              type="password"
              name="password"
              required
              className="rounded-lg border border-black/10 px-3 py-2 font-normal focus:border-orange focus:outline-none"
            />
          </label>
          <Link href="/login/forgot-password" className="-mt-2 text-right text-xs font-bold text-teal">
            Forgot password?
          </Link>
          <button
            type="submit"
            className="mt-2 rounded-full bg-orange px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Sign In
          </button>
          <p className="text-center text-sm text-navy/60">
            New board member?{" "}
            <Link href="/signup" className="font-bold text-teal">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}