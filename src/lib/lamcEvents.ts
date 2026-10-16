/**
 * Finds upcoming events on the LAMC website (lamission.edu) that are relevant
 * to SHPE members, and saves them as *suggestions* for a board member to
 * approve. Nothing is posted to the public Events page automatically.
 *
 * Free: no AI or paid API. It reads LAMC's public events pages and keeps the
 * ones whose title/description match STEM-related keywords.
 *
 * Used by:
 *  - the weekly Netlify scheduled function (netlify/functions/lamc-events-weekly.mts)
 *  - the "Check LAMC now" button on /admin/events
 *
 * Keep this file free of "@/..." imports so the Netlify function can bundle it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const LAMC_EVENTS_URL =
  process.env.LAMC_EVENTS_URL || "https://www.lamission.edu/campus-life/events";

const KEYWORDS = [
  "stem", "science", "engineer", "math", "physics", "chemistry", "biology",
  "computer", "coding", "programming", "technology", "robot", "mesa", "shpe",
  "transfer", "internship", "career", "scholarship", "research", "university",
  "workshop", "hackathon", "nasa", "jpl", "data", "maker", "steam",
];

const DEFAULT_MAX_EVENTS = 15;
const FETCH_TIMEOUT_MS = 6000;

type FoundEvent = {
  title: string;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  source_url: string;
};

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SHPE-LAMC-site event finder (student org)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decode((m[1] ?? m[2] ?? "").trim()) : null;
}

/** Turns HTML into plain text, keeping line breaks between blocks. */
function toLines(html: string) {
  const body = html
    .replace(/<(script|style|noscript|svg|nav|header|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|section|article|dd|dt)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decode(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseEventPage(html: string, url: string, date: string): FoundEvent | null {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "");
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.split("|")[0];
  const title = decode((meta(html, "og:title") || h1 || titleTag || "").trim());
  if (!title) return null;

  const lines = toLines(html);
  const titleIdx = lines.findIndex((l) => l === title);
  const afterTitle = titleIdx >= 0 ? lines.slice(titleIdx + 1) : lines;

  let description = meta(html, "og:description") || meta(html, "description");
  if (!description) {
    const firstLong = afterTitle.find((l) => l.length > 60 && !/^request for accommodation/i.test(l));
    description = firstLong ?? null;
  }
  if (description && description.length > 400) description = description.slice(0, 397) + "…";

  const text = afterTitle.slice(0, 40).join("\n");
  const time =
    text.match(
      /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s*(?:–|-|to)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)/i
    )?.[0] ?? text.match(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)/i)?.[0] ?? null;

  let location: string | null = null;
  const whereIdx = afterTitle.findIndex((l) => /^(where|location)\s*:?/i.test(l));
  if (whereIdx >= 0) {
    const inline = afterTitle[whereIdx].replace(/^(where|location)\s*:?\s*/i, "");
    location = inline || afterTitle[whereIdx + 1] || null;
  }

  return {
    title,
    description,
    event_date: date,
    event_time: time,
    location: location && location.length < 150 ? location : null,
    source_url: url,
  };
}

function isRelevant(e: FoundEvent) {
  const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
  return KEYWORDS.some((k) => hay.includes(k));
}

function todayInLA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

export async function findLamcEvents(maxEvents = DEFAULT_MAX_EVENTS) {
  const listHtml = await fetchText(LAMC_EVENTS_URL);
  if (!listHtml) {
    return { ok: false as const, error: `Couldn't load ${LAMC_EVENTS_URL}`, events: [] as FoundEvent[], scanned: 0 };
  }

  // LAMC event links look like /campus-life/events/2026/10/22/event-name
  const linkRe =
    /href=["']((?:https?:\/\/(?:www\.)?lamission\.edu)?\/campus-life\/events\/(\d{4})\/(\d{2})\/(\d{2})\/[a-z0-9-]+)\/?["']/gi;
  const today = todayInLA();
  const seen = new Map<string, string>();
  for (const m of listHtml.matchAll(linkRe)) {
    const url = m[1].startsWith("http") ? m[1] : `https://www.lamission.edu${m[1]}`;
    const date = `${m[2]}-${m[3]}-${m[4]}`;
    if (date >= today && !seen.has(url)) seen.set(url, date);
  }

  const targets = Array.from(seen.entries()).slice(0, maxEvents);
  const found: FoundEvent[] = [];

  // Fetch a few at a time to stay fast and polite to LAMC's server
  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async ([url, date]) => {
        const html = await fetchText(url);
        return html ? parseEventPage(html, url, date) : null;
      })
    );
    for (const r of results) if (r) found.push(r);
  }

  return { ok: true as const, error: null, events: found.filter(isRelevant), scanned: found.length };
}

/** Finds events and saves new ones as pending suggestions. */
export async function syncLamcEvents(supabase: SupabaseClient, maxEvents?: number) {
  const result = await findLamcEvents(maxEvents);
  if (!result.ok) return { ok: false, message: result.error, added: 0 };

  if (result.events.length === 0) {
    return {
      ok: true,
      message: `Checked ${result.scanned} upcoming LAMC events. None matched STEM keywords this time.`,
      added: 0,
    };
  }

  const { data, error } = await supabase
    .from("event_suggestions")
    .upsert(result.events, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id");

  if (error) return { ok: false, message: `Couldn't save suggestions: ${error.message}`, added: 0 };

  const added = data?.length ?? 0;
  return {
    ok: true,
    message: `Checked ${result.scanned} upcoming LAMC events. ${result.events.length} matched, ${added} new suggestion${added === 1 ? "" : "s"} added.`,
    added,
  };
}
