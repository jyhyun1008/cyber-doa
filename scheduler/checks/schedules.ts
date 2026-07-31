import { prisma } from "../../lib/db";
import { generateProactiveMessage } from "../../lib/llmReply";
import { triggerProactiveMessage } from "../send";

export async function checkSchedules(userId: string, now: Date) {
  const dueSchedules = await prisma.schedule.findMany({
    where: { userId, isSent: false, isCompleted: false, scheduledAt: { lte: now } },
  });

  for (const schedule of dueSchedules) {
    const text = await generateProactiveMessage(userId, `예정된 일정 "${schedule.title}" 시간이 되었어요.`);
    await triggerProactiveMessage(userId, text);
    await prisma.schedule.update({ where: { id: schedule.id }, data: { isSent: true } });
  }
}
