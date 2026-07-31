import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getRoutineDayKey } from "@/lib/time";

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, todos, bucketItems, routines, schedules] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: userId } }),
    prisma.todo.findMany({
      where: { userId },
      orderBy: [{ isDone: "asc" }, { deadline: "asc" }],
      take: 10,
    }),
    prisma.bucketItem.findMany({
      where: { userId },
      orderBy: [{ isDone: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
    prisma.routine.findMany({ where: { userId }, take: 20, orderBy: { createdAt: "asc" } }),
    prisma.schedule.findMany({
      where: { userId },
      orderBy: [{ isCompleted: "asc" }, { scheduledAt: "asc" }],
      take: 10,
    }),
  ]);

  return NextResponse.json({
    username: user?.username || "",
    profile: user?.profile || "",
    todos: todos.map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      isDone: t.isDone,
    })),
    bucketItems: bucketItems.map((b) => ({ id: b.id, title: b.title, isDone: b.isDone })),
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      daysOfWeek: JSON.parse(r.daysOfWeek) as number[],
      time: r.time,
      isActive: r.isActive,
      completedToday: r.lastCompletedDate === getRoutineDayKey(),
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt.toISOString(),
      isCompleted: s.isCompleted,
    })),
  });
}
