import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How-To Guide" };

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-xl text-navy">{title}</h2>
      <div className="flex flex-col gap-2 text-navy/80 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export default function AdminGuidePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-extrabold text-navy">How to run this site</h1>
      <p className="mb-8 text-navy/80">
        Everything on the public site can be changed from this admin area, no
        coding needed. This page is for every future board, so the site keeps
        working after the people who built it move on.
      </p>

      <div className="flex flex-col gap-5">
        <Step title="Every week (5 minutes)">
          <ul>
            <li>
              Open{" "}
              <a href="https://www.lamc.edu/campus-life/events" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange underline">
                LAMC&apos;s events page<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              and click your <strong>📅 Send to SHPE</strong> bookmark. (First time? Set it up
              on the <Link href="/admin/events" className="font-semibold text-orange underline">Events</Link> page,
              it takes 10 seconds.)
            </li>
            <li>
              On <Link href="/admin/events" className="font-semibold text-orange underline">Events</Link>,
              approve the LAMC events that fit the chapter and dismiss the rest. The Events page
              shows how many days since the last import.
            </li>
            <li>Add any chapter events that aren&apos;t on the LAMC calendar.</li>
            <li>
              Past events move to the bottom of the Events page by themselves, and
              scholarships disappear after their deadline. No cleanup needed.
            </li>
          </ul>
        </Step>

        <Step title="Every semester">
          <ul>
            <li>
              <Link href="/admin/board" className="font-semibold text-orange underline">Board</Link>:
              update officers, headshots, and roles.
            </li>
            <li>
              <Link href="/admin/slideshow" className="font-semibold text-orange underline">Slideshow</Link>:
              swap in new chapter photos.
            </li>
            <li>
              <Link href="/admin/scholarships" className="font-semibold text-orange underline">Scholarships</Link>{" "}
              and <Link href="/admin/sponsors" className="font-semibold text-orange underline">Sponsors</Link>:
              add new ones.
            </li>
            <li>
              <Link href="/admin/members" className="font-semibold text-orange underline">Members</Link>:
              use <strong>Download members</strong> for email blasts or SHPE National reports.
            </li>
          </ul>
        </Step>

        <Step title="Games and leaderboards">
          <ul>
            <li>
              The <strong>Weekly Wordle</strong> picks a new word every Monday on its own (700+ words,
              so it won&apos;t repeat for over 10 years). Nothing to update.
            </li>
            <li>
              Leaderboards reset each week automatically, and All time keeps the records.
            </li>
            <li>
              If someone posts an inappropriate name, delete it on the{" "}
              <Link href="/admin/leaderboards" className="font-semibold text-orange underline">Leaderboards</Link> page.
            </li>
            <li>The secret game is the discipline color bar above the footer. Keep it a secret. 🤫</li>
          </ul>
        </Step>

        <Step title="Adding photos">
          <ul>
            <li>Click <strong>Choose photo</strong> or drag a photo onto the box.</li>
            <li>Crop it, then click <strong>Use this crop</strong>.</li>
            <li>
              Fill in the <strong>photo description</strong>: one sentence describing what&apos;s
              in the picture. Screen readers read this aloud, and it&apos;s required for ADA.
            </li>
            <li>Click <strong>Save</strong> on the form. The photo isn&apos;t live until you save.</li>
          </ul>
        </Step>

        <Step title="Keeping the site accessible (ADA)">
          <ul>
            <li>Always write a photo description. If a photo has words in it, type those words.</li>
            <li>For event background colors, pick dark colors so white text stays readable.</li>
            <li>
              Upload PDFs made from Word or Google Docs, not scanned pages. A scanned
              PDF is just a picture to a screen reader.
            </li>
            <li>
              Once a semester, run the site through{" "}
              <a href="https://wave.webaim.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange underline">
                WAVE<span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              (free) and fix anything it flags in red.
            </li>
          </ul>
        </Step>

        <Step title="Email alerts">
          <ul>
            <li>
              The board inbox gets an email when someone joins, when a sponsor fills
              out the sponsor form, and a Monday reminder to import LAMC events.
            </li>
            <li>
              To change which inbox gets alerts, update <strong>NOTIFY_EMAIL</strong> in
              Netlify (Site configuration, then Environment variables).
            </li>
          </ul>
        </Step>

        <Step title="Adding new board members as admins">
          <ul>
            <li>They go to the <strong>Board login</strong> link at the bottom of any page and create an account.</li>
            <li>The owner approves them on the <strong>Approvals</strong> page.</li>
          </ul>
        </Step>

        <Step title="Handing off the site (when the owner graduates)">
          <ul>
            <li>
              On <strong>Approvals</strong>, use <strong>Make Owner</strong> to give ownership to the next president.
            </li>
            <li>
              Transfer or share access to the accounts behind the site: <strong>GitHub</strong>{" "}
              (the code), <strong>Netlify</strong> (hosting), <strong>Supabase</strong> (the
              database and photos), and <strong>Resend</strong> (email alerts). Ideally these
              live under the chapter&apos;s email, not a personal one.
            </li>
            <li>Update the Contact info and Our Story text on the Site Content page.</li>
          </ul>
        </Step>
      </div>
    </div>
  );
}
