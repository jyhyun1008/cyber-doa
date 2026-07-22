import { prisma } from "../../lib/db";
import { generateProactiveMessage } from "../../lib/llmReply";
import { triggerProactiveMessage } from "../send";

export async function checkSchedules(now: Date) {
  const dueSchedules = await prisma.schedule.findMany({
    where: { isSent: false, scheduledAt: { lte: now } },
  });

  for (const schedule of dueSchedules) {
    const text = await generateProactiveMessage(`예정된 일정 "${schedule.title}" 시간이 되었어요.`);
    await triggerProactiveMessage(text);
    await prisma.schedule.update({ where: { id: schedule.id }, data: { isSent: true } });
  }
}
