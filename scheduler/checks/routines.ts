import { prisma } from "../../lib/db";
import { getWeekday, getHHMM, getDateKey } from "../../lib/time";
import { generateProactiveMessage } from "../../lib/llmReply";
import { triggerProactiveMessage } from "../send";

export async function checkRoutines(now: Date) {
  const routines = await prisma.routine.findMany({ where: { isActive: true } });
  const todayWeekday = getWeekday(now);
  const nowHHMM = getHHMM(now);
  const todayKey = getDateKey(now);

  for (const routine of routines) {
    if (routine.lastTriggeredDate === todayKey) continue;
    if (routine.time !== nowHHMM) continue;

    let days: number[] = [];
    try {
      days = JSON.parse(routine.daysOfWeek);
    } catch {
      continue;
    }
    if (!days.includes(todayWeekday)) continue;

    const text = await generateProactiveMessage(`매일/요일 반복 루틴 "${routine.title}" 시간이 되었어요.`);
    await triggerProactiveMessage(text);
    await prisma.routine.update({
      where: { id: routine.id },
      data: { lastTriggeredDate: todayKey },
    });
  }
}
