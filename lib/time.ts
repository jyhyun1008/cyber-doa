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

export function formatKoreanDateTime(date: Date = new Date()): string {
  const p = partsFor(date);
  return `${p.year}-${p.month}-${p.day} (${WEEKDAY_LABELS_KO[p.weekdayIndex]}) ${p.hour}:${p.minute}`;
}

export function isWithinMinutesAfter(target: Date, now: Date, minutes: number): boolean {
  const diffMs = now.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= minutes * 60_000;
}

/** Builds a UTC Date from KST (Asia/Seoul) calendar components. */
export function kstDateTimeToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - SEOUL_OFFSET_MINUTES * 60_000);
}

/** Noon KST on the calendar day before `date` (also in KST). */
export function noonKstDayBefore(date: Date): Date {
  const p = partsFor(date);
  const dayBefore = kstDateTimeToUTC(Number(p.year), Number(p.month), Number(p.day), 12, 0);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  return dayBefore;
}
