import type { WeeklyHours } from "@/lib/service-categories";

export type OpenStatus =
  | { state: "open"; label: string }
  | { state: "closed"; label: string }
  | { state: "unknown" };

const WEEKDAY_MAP: Record<string, keyof WeeklyHours> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

function parseRange(range: string): { start: number; end: number } | null {
  const match = range.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, h1, m1, h2, m2] = match;
  const start = parseInt(h1, 10) * 60 + parseInt(m1, 10);
  const end = parseInt(h2, 10) * 60 + parseInt(m2, 10);
  if (isNaN(start) || isNaN(end) || start >= end) return null;
  return { start, end };
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Compute open/closed status for a service, using Cuba local time.
 * Returns null when hours are not set.
 */
export function getOpenStatus(hours: WeeklyHours | null | undefined): OpenStatus {
  if (!hours) return { state: "unknown" };

  const now = new Date();
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    weekday: "short",
  }).format(now);
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Havana",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const todayKey = WEEKDAY_MAP[weekdayShort];
  if (!todayKey) return { state: "unknown" };

  const [nowH, nowM] = hhmm.split(":");
  const nowMin = parseInt(nowH, 10) * 60 + parseInt(nowM, 10);

  const todayRange = hours[todayKey];
  if (todayRange) {
    const parsed = parseRange(todayRange);
    if (parsed) {
      if (nowMin >= parsed.start && nowMin < parsed.end) {
        return { state: "open", label: `Abierto hasta ${toHHMM(parsed.end)}` };
      }
      if (nowMin < parsed.start) {
        return { state: "closed", label: `Abre a las ${toHHMM(parsed.start)}` };
      }
    }
  }

  return { state: "closed", label: "Cerrado" };
}
