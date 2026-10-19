/** Week helpers, all in Los Angeles time. Weeks start Monday. */

function laDateParts(d = new Date()) {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-")
    .map(Number);
  return { y, m, day };
}

/** ISO week like "2026-W43" */
export function weekKey(d = new Date()) {
  const { y, m, day } = laDateParts(d);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dow = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dow); // Thursday of this week
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function lastWeekKey() {
  return weekKey(new Date(Date.now() - 7 * 86400000));
}

/** Number of whole weeks since Monday, Jan 5 2026 (LA time). */
export function weekNumber(d = new Date()) {
  const { y, m, day } = laDateParts(d);
  const date = Date.UTC(y, m - 1, day);
  const epoch = Date.UTC(2026, 0, 5);
  return Math.floor((date - epoch) / (7 * 86400000));
}

/** Days until the next Monday reset, for "new word in X days" */
export function daysUntilReset(d = new Date()) {
  const { y, m, day } = laDateParts(d);
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay() || 7;
  return 8 - dow;
}
