import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, todos, routines, schedules] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: userId } }),
    prisma.todo.findMany({ where: { userId, isDone: false }, orderBy: { deadline: "asc" }, take: 10 }),
    prisma.routine.findMany({ where: { userId }, take: 20, orderBy: { createdAt: "asc" } }),
    prisma.schedule.findMany({ where: { userId, isSent: false }, orderBy: { scheduledAt: "asc" }, take: 10 }),
  ]);

  return NextResponse.json({
    username: user?.username || "",
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
      isActive: r.isActive,
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
  });
}
