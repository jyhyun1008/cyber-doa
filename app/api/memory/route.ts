import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [user, todos, routines, schedules] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: 1 } }),
    prisma.todo.findMany({ where: { isDone: false }, orderBy: { deadline: "asc" }, take: 10 }),
    prisma.routine.findMany({ where: { isActive: true }, take: 10 }),
    prisma.schedule.findMany({ where: { isSent: false }, orderBy: { scheduledAt: "asc" }, take: 10 }),
  ]);

  return NextResponse.json({
    profile: user?.profile || "",
    todos: todos.map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline ? t.deadline.toISOString() : null,
    })),
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      daysOfWeek: JSON.parse(r.daysOfWeek) as number[],
      time: r.time,
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
  });
}
