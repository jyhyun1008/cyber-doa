// Fixed to Asia/Seoul (no DST) so date-math helpers below can use a plain UTC+9 offset
// instead of re-deriving the offset from Intl for every conversion.
const TIME_ZONE = "Asia/Seoul";
const SEOUL_OFFSET_MINUTES = 9 * 60;

const WEEKDAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function partsFor(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.weekday
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === "24" ? "00" : parts.hour,
    minute: parts.minute,
    weekdayIndex,
  };
}

/** 0=Sun..6=Sat, in the app's configured timezone */
export function getWeekday(date: Date = new Date()): number {
  return partsFor(date).weekdayIndex;
}

/** "HH:mm" in the app's configured timezone */
export function getHHMM(date: Date = new Date()): string {
  const p = partsFor(date);
  return `${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DD" in the app's configured timezone */
export function getDateKey(date: Date = new Date()): string {
  const p = partsFor(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * "YYYY-MM-DD" in the app's configured timezone, but treating 00:00–04:59 as still belonging
 * to the previous day — used for routine-completion tracking so a late-night check-off (or the
 * daily reset) lands on the day it was actually meant for, not the next calendar day.
 */
export function getRoutineDayKey(date: Date = new Date()): string {
  const p = partsFor(date);
  if (Number(p.hour) < 5) {
    return getDateKey(new Date(date.getTime() - 24 * 60 * 60 * 1000));
  }
  return getDateKey(date);
}

export function formatKoreanDateTime(date: Date = new Date()): string {
  const p = partsFor(date);
  return `${p.year}-${p.month}-${p.day} (${WEEKDAY_LABELS_KO[p.weekdayIndex]}) ${p.hour}:${p.minute}`;
}

/** ISO 8601 with an explicit +09:00 offset, e.g. "2026-07-22T13:28:00+09:00" — unambiguous for LLM date math. */
export function isoKstOffset(date: Date = new Date()): string {
  const p = partsFor(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00+09:00`;
}

export function isWithinMinutesAfter(target: Date, now: Date, minutes: number): boolean {
  const diffMs = now.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= minutes * 60_000;
}

/** Builds a UTC Date from KST (Asia/Seoul) calendar components. */
export function kstDateTimeToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - SEOUL_OFFSET_MINUTES * 60_000);
}

/** Sentinel HH:mm used for schedules (일정) where the user gave only a date, no specific start time. */
export const NO_TIME_SENTINEL_HHMM = "05:01";

/** Sentinel HH:mm used for deadlines (데드라인) where the user gave only a due date — "by end of day". */
export const NO_TIME_DEADLINE_SENTINEL_HHMM = "23:59";

function applySentinelTime(date: Date, hasTime: boolean, sentinelHHMM: string): Date {
  if (hasTime) return date;
  const p = partsFor(date);
  const [hour, minute] = sentinelHHMM.split(":").map(Number);
  return kstDateTimeToUTC(Number(p.year), Number(p.month), Number(p.day), hour, minute);
}

/**
 * If `hasTime` is false, snaps `date` to 05:01 KST on the same calendar day — callers later check
 * `getHHMM(date) === NO_TIME_SENTINEL_HHMM` to know when to hide the time portion in the UI instead
 * of showing a made-up time the user never specified. Used for schedules (일정).
 */
export function applyDateOnlySentinel(date: Date, hasTime: boolean): Date {
  return applySentinelTime(date, hasTime, NO_TIME_SENTINEL_HHMM);
}

/**
 * Same idea as `applyDateOnlySentinel`, but for deadlines (데드라인): snaps to 23:59 KST — a
 * date-only deadline means "due by end of that day", not "due first thing in the morning".
 */
export function applyDeadlineDateOnlySentinel(date: Date, hasTime: boolean): Date {
  return applySentinelTime(date, hasTime, NO_TIME_DEADLINE_SENTINEL_HHMM);
}

/** Noon KST on the calendar day before `date` (also in KST). */
export function noonKstDayBefore(date: Date): Date {
  const p = partsFor(date);
  const dayBefore = kstDateTimeToUTC(Number(p.year), Number(p.month), Number(p.day), 12, 0);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  return dayBefore;
}
