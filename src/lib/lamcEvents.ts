/**
 * Finds upcoming events on the LAMC website (lamc.edu) for students
 * and saves them as *suggestions* for a board member to
 * approve. Nothing is posted to the public Events page automatically.
 *
 * Free: no AI or paid API. It reads LAMC's public events pages and suggests every
 * upcoming event. Board members choose which ones to post.
 *
 * Used by:
 *  - the weekly Netlify scheduled function (netlify/functions/lamc-events-weekly.mts)
 *  - the "Check LAMC now" button on /admin/events
 *
 * Keep this file free of "@/..." imports so the Netlify function can bundle it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// LAMC moved from lamission.edu to lamc.edu. The homepage also lists
// upcoming events, so both pages are checked.
export const LAMC_EVENTS_URLS = (
  process.env.LAMC_EVENTS_URL ||
  "https://www.lamc.edu/campus-life/events,https://www.lamc.edu/"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const LAMC_ORIGIN = "https://www.lamc.edu";

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

let lastProblem = "";

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Look like a normal browser so basic bot filters let us read public pages
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      lastProblem =
        res.status === 403 || res.status === 429 || res.status === 503
          ? `LAMC's website blocked the request (bot protection, status ${res.status})`
          : `LAMC's website answered with status ${res.status}`;
      return null;
    }
    return await res.text();
  } catch (err) {
    lastProblem =
      (err as Error)?.name === "AbortError"
        ? "LAMC's website took too long to answer"
        : "Couldn't reach LAMC's website";
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

export function isRelevant(e: FoundEvent) {
  const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
  return KEYWORDS.some((k) => hay.includes(k));
}

function todayInLA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

export async function findLamcEvents(maxEvents = DEFAULT_MAX_EVENTS) {
  lastProblem = "";
  const pages = (await Promise.all(LAMC_EVENTS_URLS.map(fetchText))).filter(
    (p): p is string => Boolean(p)
  );
  if (pages.length === 0) {
    return {
      ok: false as const,
      error: lastProblem || "Couldn't load LAMC's events page",
      events: [] as FoundEvent[],
      scanned: 0,
    };
  }

  // LAMC event links look like /campus-life/events/2026/10/22/event-name
  // (month and day aren't always two digits, e.g. /2026/7/1/)
  const linkRe =
    /href=["']((?:https?:\/\/(?:www\.)?(?:lamc|lamission)\.edu)?\/campus-life\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/[a-z0-9-]+)\/?["']/gi;
  const today = todayInLA();
  const seen = new Map<string, string>();
  for (const html of pages) {
    for (const m of html.matchAll(linkRe)) {
      const path = m[1].replace(/^https?:\/\/(?:www\.)?(?:lamc|lamission)\.edu/i, "");
      const url = `${LAMC_ORIGIN}${path}`;
      const date = `${m[2]}-${m[3].padStart(2, "0")}-${m[4].padStart(2, "0")}`;
      if (date >= today && !seen.has(url)) seen.set(url, date);
    }
  }

  if (seen.size === 0) {
    return {
      ok: true as const,
      error: null,
      events: [] as FoundEvent[],
      scanned: 0,
    };
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

  // All upcoming LAMC events are suggested, not just STEM ones. Board members
  // decide what to post. To go back to STEM-only, use found.filter(isRelevant).
  return { ok: true as const, error: null, events: found, scanned: found.length };
}

/** Finds events and saves new ones as pending suggestions. */
export async function syncLamcEvents(supabase: SupabaseClient, maxEvents?: number) {
  const result = await findLamcEvents(maxEvents);
  if (!result.ok) return { ok: false, message: result.error, added: 0 };

  if (result.events.length === 0) {
    return {
      ok: true,
      message:
        result.scanned === 0
          ? "Loaded LAMC's site, but didn't find any upcoming event links on it."
          : `Checked ${result.scanned} upcoming LAMC events, but couldn't read any of them.`,
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
    message: `Found ${result.events.length} upcoming LAMC event${result.events.length === 1 ? "" : "s"}. ${added} new suggestion${added === 1 ? "" : "s"} added${added < result.events.length ? " (the rest were already in your list)" : ""}.`,
    added,
  };
}
