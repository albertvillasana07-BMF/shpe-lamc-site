/**
 * Sends a plain-text email alert to the board using Resend (free plan).
 *
 * Setup (one time, in Netlify → Site configuration → Environment variables):
 *   RESEND_API_KEY   your key from resend.com → API Keys
 *   NOTIFY_EMAIL     the inbox that gets alerts (use the same email you
 *                    signed up to Resend with, unless you verify a domain)
 *   NOTIFY_FROM      optional. Defaults to Resend's test sender, which can
 *                    only send to your own Resend account email.
 *
 * If those aren't set, this quietly does nothing, so the site keeps working.
 * Keep this file free of "@/..." imports so the Netlify function can use it.
 */
export async function notifyBoard(subject: string, lines: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.NOTIFY_FROM || "SHPE LAMC Website <onboarding@resend.dev>";
  const siteUrl = process.env.URL || "";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[SHPE LAMC site] ${subject}`,
        text: [...lines, "", siteUrl ? `Admin dashboard: ${siteUrl}/admin` : ""].join("\n"),
      }),
    });
  } catch (err) {
    // An email failing should never break a sign-up or form submission
    console.error("notifyBoard failed", err);
  }
}
