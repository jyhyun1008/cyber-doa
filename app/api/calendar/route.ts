import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getWeekday, getHHMM, getDateKey, kstDateTimeToUTC, NO_TIME_SENTINEL_HHMM } from "@/lib/time";

type CalendarItem = {
  date: string; // "YYYY-MM-DD" in KST
  type: "routine" | "schedule" | "todo";
  title: string;
  time: string | null; // "HH:mm" in KST, null for todo deadlines with no meaningful time
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const nowKey = getDateKey(now);
  const year = Number(searchParams.get("year")) || Number(nowKey.slice(0, 4));
  const month = Number(searchParams.get("month")) || Number(nowKey.slice(5, 7));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "invalid year/month" }, { status: 400 });
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [routines, todos, schedules] = await Promise.all([
    prisma.routine.findMany({ where: { userId, isActive: true } }),
    prisma.todo.findMany({ where: { userId, deadline: { not: null } } }),
    prisma.schedule.findMany({ where: { userId } }),
  ]);

  const items: CalendarItem[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = getWeekday(kstDateTimeToUTC(year, month, day, 12, 0));
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;

    for (const routine of routines) {
      let days: number[] = [];
      try {
        days = JSON.parse(routine.daysOfWeek);
      } catch {
        continue;
      }
      if (days.includes(weekday)) {
        items.push({ date: dateKey, type: "routine", title: routine.title, time: routine.time });
      }
    }
  }

  for (const todo of todos) {
    if (!todo.deadline) continue;
    const dateKey = getDateKey(todo.deadline);
    if (dateKey.slice(0, 4) === String(year) && Number(dateKey.slice(5, 7)) === month) {
      items.push({ date: dateKey, type: "todo", title: todo.title, time: null });
    }
  }

  for (const schedule of schedules) {
    const dateKey = getDateKey(schedule.scheduledAt);
    if (dateKey.slice(0, 4) === String(year) && Number(dateKey.slice(5, 7)) === month) {
      const hhmm = getHHMM(schedule.scheduledAt);
      items.push({
        date: dateKey,
        type: "schedule",
        title: schedule.title,
        time: hhmm === NO_TIME_SENTINEL_HHMM ? null : hhmm,
      });
    }
  }

  return NextResponse.json({ year, month, items });
}
