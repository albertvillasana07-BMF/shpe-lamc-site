// Runs every Monday morning (8 AM Pacific) on Netlify, for free.
// LAMC's website blocks automated tools, so instead of reading it directly,
// this emails the board a reminder to import events with the Send to SHPE bookmark.
//
// Uses the email alert settings (RESEND_API_KEY and NOTIFY_EMAIL in Netlify).
// If those aren't set up, it simply does nothing.
import { notifyBoard } from "../../src/lib/notify";

const lamcEventsWeekly = async () => {
  await notifyBoard("Monday reminder: import LAMC events", [
    "Time to pull this week's campus events onto the SHPE site:",
    "",
    "1. Open https://www.lamc.edu/campus-life/events",
    "2. Click your 'Send to SHPE' bookmark",
    "3. Approve the events you want on the admin Events page",
  ]);
  return new Response("Reminder sent (if email alerts are set up)");
};

export default lamcEventsWeekly;

export const config = {
  schedule: "0 15 * * 1",
};
