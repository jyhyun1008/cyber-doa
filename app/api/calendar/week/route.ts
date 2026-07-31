import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  getWeekday,
  getHHMM,
  getDateKey,
  kstDateTimeToUTC,
  NO_TIME_SENTINEL_HHMM,
  NO_TIME_DEADLINE_SENTINEL_HHMM,
} from "@/lib/time";

type CalendarItem = {
  date: string; // "YYYY-MM-DD" in KST
  type: "routine" | "schedule" | "todo";
  title: string;
  time: string | null; // "HH:mm" in KST, null when no specific time was given
};

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const match = startParam?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NextResponse.json({ error: "invalid start (expected YYYY-MM-DD)" }, { status: 400 });

  const [, yStr, mStr, dStr] = match;
  const startYear = Number(yStr);
  const startMonth = Number(mStr);
  const startDay = Number(dStr);

  const weekDays: { year: number; month: number; day: number; date: string }[] = [];
  let cursor = kstDateTimeToUTC(startYear, startMonth, startDay, 12, 0);
  for (let i = 0; i < 7; i++) {
    const dateKey = getDateKey(cursor);
    const [y, m, d] = dateKey.split("-").map(Number);
    weekDays.push({ year: y, month: m, day: d, date: dateKey });
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  const rangeStart = kstDateTimeToUTC(startYear, startMonth, startDay, 0, 0);
  const rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [routines, todos, schedules] = await Promise.all([
    prisma.routine.findMany({ where: { userId, isActive: true } }),
    prisma.todo.findMany({ where: { userId, deadline: { gte: rangeStart, lt: rangeEnd } } }),
    prisma.schedule.findMany({ where: { userId, scheduledAt: { gte: rangeStart, lt: rangeEnd } } }),
  ]);

  const items: CalendarItem[] = [];

  for (const { year, month, day, date } of weekDays) {
    const weekday = getWeekday(kstDateTimeToUTC(year, month, day, 12, 0));
    for (const routine of routines) {
      let daysOfWeek: number[] = [];
      try {
        daysOfWeek = JSON.parse(routine.daysOfWeek);
      } catch {
        continue;
      }
      if (daysOfWeek.includes(weekday)) {
        items.push({ date, type: "routine", title: routine.title, time: routine.time });
      }
    }
  }

  for (const todo of todos) {
    if (!todo.deadline) continue;
    const hhmm = getHHMM(todo.deadline);
    items.push({
      date: getDateKey(todo.deadline),
      type: "todo",
      title: todo.title,
      time: hhmm === NO_TIME_DEADLINE_SENTINEL_HHMM ? null : hhmm,
    });
  }

  for (const schedule of schedules) {
    const hhmm = getHHMM(schedule.scheduledAt);
    items.push({
      date: getDateKey(schedule.scheduledAt),
      type: "schedule",
      title: schedule.title,
      time: hhmm === NO_TIME_SENTINEL_HHMM ? null : hhmm,
    });
  }

  return NextResponse.json({ start: weekDays[0].date, items });
}
