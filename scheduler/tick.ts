import { prisma } from "../lib/db";
import { checkRoutines } from "./checks/routines";
import { checkSchedules } from "./checks/schedules";
import { checkDeadlines } from "./checks/deadlines";
import { checkIdle } from "./checks/idle";

export async function tick() {
  const now = new Date();
  const users = await prisma.appUser.findMany({ select: { id: true } });

  // sequential, not Promise.all — better-sqlite3 is a single synchronous connection
  for (const { id: userId } of users) {
    await checkRoutines(userId, now);
    await checkSchedules(userId, now);
    await checkDeadlines(userId, now);
    await checkIdle(userId, now);
  }
}
