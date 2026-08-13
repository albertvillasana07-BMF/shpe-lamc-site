import Image from "next/image";
import PageHeader from "@/components/PageHeader";

const SIGNUP_URL =
  "https://docs.google.com/forms/d/1cKWRkxpgeTNlC2a74ls8foqbB2JEeQAMwVCgTlVdYug/viewform";

export default function JoinPage() {
  return (
    <div>
      <PageHeader
        title="Join SHPE LAMC"
        subtitle="Sign up for emails and updates — it only takes a minute."
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-12 text-center">
        <div className="rounded-2xl border-2 border-gold bg-white p-4 shadow-md">
          <Image
            src="/images/signup_qr.png"
            alt="Scan to sign up"
            width={220}
            height={220}
          />
        </div>
        <p className="text-navy/70">
          Scan the QR code, or use the button below to fill out the sign-up form
          (name, student ID, student email, phone number).
        </p>
        <a
          href={SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-orange px-8 py-3 text-sm font-bold text-white shadow hover:opacity-90"
        >
          Open Sign-Up Form
        </a>
      </div>
    </div>
  );
}
