import { prisma } from "../../lib/db";
import { noonKstDayBefore } from "../../lib/time";
import { generateProactiveMessage } from "../../lib/llmReply";
import { triggerProactiveMessage } from "../send";

export async function checkDeadlines(userId: string, now: Date) {
  const openTodos = await prisma.todo.findMany({
    where: { userId, isDone: false, deadline: { not: null }, lastDeadlineReminderSentAt: null },
  });

  for (const todo of openTodos) {
    if (!todo.deadline) continue;
    const reminderPoint = noonKstDayBefore(todo.deadline);
    if (now < reminderPoint || now >= todo.deadline) continue;

    const text = await generateProactiveMessage(
      userId,
      `데드라인 "${todo.title}"의 마감일(${todo.deadline.toISOString()})이 내일이에요. 미리 알려주세요.`
    );
    await triggerProactiveMessage(userId, text);
    await prisma.todo.update({
      where: { id: todo.id },
      data: { lastDeadlineReminderSentAt: now },
    });
  }
}
