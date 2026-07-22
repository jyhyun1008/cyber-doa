import { prisma } from "../../lib/db";
import { generateProactiveMessage } from "../../lib/llmReply";
import { triggerProactiveMessage } from "../send";

const IDLE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function checkIdle(now: Date) {
  const user = await prisma.appUser.findUnique({ where: { id: 1 } });
  if (!user?.lastSeenAt) return;

  const idleFor = now.getTime() - user.lastSeenAt.getTime();
  if (idleFor < IDLE_THRESHOLD_MS) return;

  if (user.lastIdlePingSentAt) {
    const sinceLastPing = now.getTime() - user.lastIdlePingSentAt.getTime();
    if (sinceLastPing < IDLE_THRESHOLD_MS) return;
  }

  const text = await generateProactiveMessage(
    "유저가 만 하루 넘게 대화를 하지 않았어요. 심심하다는 듯 안부를 물어봐주세요."
  );
  await triggerProactiveMessage(text);
  await prisma.appUser.update({ where: { id: 1 }, data: { lastIdlePingSentAt: now } });
}
