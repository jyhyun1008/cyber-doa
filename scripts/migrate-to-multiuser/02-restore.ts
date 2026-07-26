// Restores a dump produced by 01-dump-raw.ts into the new multiuser schema.
// Must be run AFTER `prisma migrate deploy`/`migrate dev` has created the new (empty) tables.
import fs from "node:fs";
import { prisma } from "../../lib/db";

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error("사용법: tsx 02-restore.ts <path-to-multiuser-migration-dump.json>");
  process.exit(1);
}

type RawRow = Record<string, unknown>;

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

async function main() {
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  if (!dump.appUser) {
    throw new Error("dump has no appUser row — nothing to restore");
  }

  const newUser = await prisma.appUser.create({
    data: {
      username: dump.appUser.username,
      passwordHash: dump.appUser.passwordHash,
      profile: dump.appUser.profile ?? "",
      lastSeenAt: toDate(dump.appUser.lastSeenAt),
      lastIdlePingSentAt: toDate(dump.appUser.lastIdlePingSentAt),
      createdAt: toDate(dump.appUser.createdAt) ?? new Date(),
      isOwner: true,
    },
  });

  const messages: RawRow[] = dump.messages ?? [];
  if (messages.length) {
    await prisma.message.createMany({
      data: messages.map((m) => ({
        id: m.id as string,
        userId: newUser.id,
        role: m.role as string,
        content: m.content as string,
        source: (m.source as string) ?? "chat",
        thinkingSeconds: m.thinkingSeconds == null ? null : Number(m.thinkingSeconds),
        createdAt: toDate(m.createdAt) ?? new Date(),
      })),
    });
  }

  const todos: RawRow[] = dump.todos ?? [];
  if (todos.length) {
    await prisma.todo.createMany({
      data: todos.map((t) => ({
        id: t.id as string,
        userId: newUser.id,
        title: t.title as string,
        deadline: toDate(t.deadline),
        isDone: toBool(t.isDone),
        lastDeadlineReminderSentAt: toDate(t.lastDeadlineReminderSentAt),
        createdAt: toDate(t.createdAt) ?? new Date(),
        updatedAt: toDate(t.updatedAt) ?? new Date(),
      })),
    });
  }

  const routines: RawRow[] = dump.routines ?? [];
  if (routines.length) {
    await prisma.routine.createMany({
      data: routines.map((r) => ({
        id: r.id as string,
        userId: newUser.id,
        title: r.title as string,
        daysOfWeek: r.daysOfWeek as string,
        time: r.time as string,
        isActive: toBool(r.isActive),
        lastTriggeredDate: (r.lastTriggeredDate as string) ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      })),
    });
  }

  const schedules: RawRow[] = dump.schedules ?? [];
  if (schedules.length) {
    await prisma.schedule.createMany({
      data: schedules.map((s) => ({
        id: s.id as string,
        userId: newUser.id,
        title: s.title as string,
        scheduledAt: toDate(s.scheduledAt) ?? new Date(),
        isSent: toBool(s.isSent),
        createdAt: toDate(s.createdAt) ?? new Date(),
      })),
    });
  }

  const pushSubscriptions: RawRow[] = dump.pushSubscriptions ?? [];
  if (pushSubscriptions.length) {
    await prisma.pushSubscription.createMany({
      data: pushSubscriptions.map((p) => ({
        id: p.id as string,
        userId: newUser.id,
        endpoint: p.endpoint as string,
        p256dh: p.p256dh as string,
        auth: p.auth as string,
        createdAt: toDate(p.createdAt) ?? new Date(),
      })),
    });
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, signupEnabled: true },
  });

  const [messageCount, todoCount, routineCount, scheduleCount, pushCount] = await Promise.all([
    prisma.message.count({ where: { userId: newUser.id } }),
    prisma.todo.count({ where: { userId: newUser.id } }),
    prisma.routine.count({ where: { userId: newUser.id } }),
    prisma.schedule.count({ where: { userId: newUser.id } }),
    prisma.pushSubscription.count({ where: { userId: newUser.id } }),
  ]);

  console.log("Restored user:", newUser.id, newUser.username, "isOwner:", newUser.isOwner);
  console.log("dump counts:  ", {
    messages: messages.length,
    todos: todos.length,
    routines: routines.length,
    schedules: schedules.length,
    pushSubscriptions: pushSubscriptions.length,
  });
  console.log("restored counts:", {
    messages: messageCount,
    todos: todoCount,
    routines: routineCount,
    schedules: scheduleCount,
    pushSubscriptions: pushCount,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
