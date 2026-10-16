import type { EventRow } from "@/lib/types";

type Clock = { h: number; m: number };

function toClock(raw: string, fallbackMeridiem?: string): { clock: Clock; meridiem?: string } | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const mer = m[3] ? m[3][0].toLowerCase() : fallbackMeridiem;
  if (h > 23 || min > 59) return null;
  if (mer === "p" && h < 12) h += 12;
  if (mer === "a" && h === 12) h = 0;
  return { clock: { h, m: min }, meridiem: mer };
}

/**
 * Reads free-typed times like "6:00 PM", "12–4 pm", or "10am - 1:30pm".
 * Returns null if it can't tell, and the event becomes an all-day event.
 */
export function parseEventTime(text: string | null): { start: Clock; end: Clock } | null {
  if (!text) return null;
  const range = text.match(
    /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:–|—|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i
  );
  if (range) {
    const end = toClock(range[2]);
    const start = toClock(range[1], end?.meridiem);
    if (start && end) {
      // "11–1 pm" means 11 AM to 1 PM
      if (start.clock.h > end.clock.h && !/[ap]/i.test(range[1])) start.clock.h -= 12;
      return { start: start.clock, end: end.clock };
    }
  }
  const single = text.match(/\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)/i);
  if (single) {
    const start = toClock(single[0]);
    if (start) {
      const endH = Math.min(start.clock.h + 1, 23);
      return { start: start.clock, end: { h: endH, m: start.clock.m } };
    }
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const compactDate = (d: string) => d.replaceAll("-", "");

function nextDay(d: string) {
  const dt = new Date(`${d}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/** Link that opens Google Calendar with the event filled in. */
export function googleCalendarUrl(e: EventRow) {
  if (!e.event_date) return null;
  const t = parseEventTime(e.event_time);
  const d = compactDate(e.event_date);
  const dates = t
    ? `${d}T${pad(t.start.h)}${pad(t.start.m)}00/${d}T${pad(t.end.h)}${pad(t.end.m)}00`
    : `${d}/${compactDate(nextDay(e.event_date))}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates,
    ctz: "America/Los_Angeles",
  });
  if (e.description) params.set("details", e.description);
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A .ics file that works with Apple Calendar, Outlook, and Google. */
export function buildIcs(e: EventRow, siteUrl: string) {
  if (!e.event_date) return null;
  const t = parseEventTime(e.event_time);
  const d = compactDate(e.event_date);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const when = t
    ? [
        `DTSTART;TZID=America/Los_Angeles:${d}T${pad(t.start.h)}${pad(t.start.m)}00`,
        `DTEND;TZID=America/Los_Angeles:${d}T${pad(t.end.h)}${pad(t.end.m)}00`,
      ]
    : [`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${compactDate(nextDay(e.event_date))}`];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SHPE LAMC//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@shpe-lamc`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${icsEscape(e.title)}`,
    e.description ? `DESCRIPTION:${icsEscape(e.description)}` : "",
    e.location ? `LOCATION:${icsEscape(e.location)}` : "",
    `URL:${siteUrl}/events`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n") + "\r\n";
}
