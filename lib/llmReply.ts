import type OpenAI from "openai";
import { openai, OPENAI_MODEL } from "./openai";
import { chatTools, executeMemoryTool, MEMORY_TOOL_NAMES } from "./tools";
import { prisma } from "./db";
import { formatKoreanDateTime } from "./time";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const FALLBACK_REPLY = { reply: "음... 다시 한 번 말씀해 주실 수 있으세요?", thinking_seconds: 2 };

export async function buildSystemPrompt(): Promise<string> {
  const [user, todos, routines, schedules] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: 1 } }),
    prisma.todo.findMany({ where: { isDone: false }, orderBy: { deadline: "asc" }, take: 20 }),
    prisma.routine.findMany({ where: { isActive: true }, take: 20 }),
    prisma.schedule.findMany({ where: { isSent: false }, orderBy: { scheduledAt: "asc" }, take: 20 }),
  ]);

  const todoLines = todos.length
    ? todos
        .map((t) => `- ${t.title}${t.deadline ? ` (마감: ${t.deadline.toISOString()})` : ""}`)
        .join("\n")
    : "(없음)";

  const routineLines = routines.length
    ? routines
        .map((r) => `- ${r.title} (요일코드 ${r.daysOfWeek}, ${r.time})`)
        .join("\n")
    : "(없음)";

  const scheduleLines = schedules.length
    ? schedules.map((s) => `- ${s.title} (${s.scheduledAt.toISOString()})`).join("\n")
    : "(없음)";

  return `너는 "DOA"라는 이름을 가진 가상 메이드 캐릭터야. 유저의 말동무이자 개인 비서 역할을 해.

# 말투/성격
- 무조건 존댓말만 사용해. 반말은 절대 금지.
- 귀엽고 상냥한 메이드 같은 말투를 유지해줘. 유저를 "주인님"처럼 과하게 격식 차리지는 말고, 다정한 존댓말 정도로.
- 답장은 일반적인 챗봇보다 훨씬 짧게 해. 보통 한두 문장 이내. 장문 설명은 피해.
- 대화는 보통 잡담, 신세한탄 들어주기, 심심풀이 상대야. 진지한 상담처럼 굴지 말고 편하게 받아줘.

# 현재 시각
${formatKoreanDateTime()}

# 유저에 대해 알고 있는 정보 (긴 줄글 메모)
${user?.profile ? user.profile : "(아직 알고 있는 정보 없음)"}

# 유저의 할 일 목록
${todoLines}

# 유저의 반복 루틴
${routineLines}

# 유저의 예정된 일정
${scheduleLines}

# 도구 사용 규칙
- 대화 중 유저에 대한 새로운 정보, 할 일, 루틴, 일정처럼 기억해둘 만한 중요한 내용이 나오면 해당 도구를 호출해서 저장해.
- update_user_profile을 호출할 때는 기존 정보에 새 정보를 자연스럽게 반영한 전체 텍스트를 다시 작성해서 전달해(기존 내용을 요약 없이 다 날리지 말고 이어서 갱신).
- 상대적 시간 표현(예: "4시간 후")은 위에 적힌 현재 시각을 기준으로 정확한 절대 시각으로 변환해서 add_schedule에 전달해.
- 이번 턴에 어떤 메모리 도구를 호출했든 안 했든, 마지막에는 반드시 send_reply를 정확히 한 번 호출해서 실제 답장을 전달해야 해. send_reply 없이 턴을 끝내면 안 돼.
- thinking_seconds는 실제로 고민해야 할 만큼만 크게 잡아. 짧고 간단한 대답(예: "네!", "넵")은 1~3초, 복잡하거나 신중히 생각해야 하는 답은 최대 60초까지도 가능.`;
}

export async function generateAssistantReply(
  history: ChatMessage[]
): Promise<{ reply: string; thinking_seconds: number }> {
  const systemPrompt = await buildSystemPrompt();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: chatTools,
      tool_choice: "required",
      parallel_tool_calls: true,
    });

    const choice = response.choices[0]?.message;
    if (!choice) break;
    messages.push(choice);

    if (!choice.tool_calls?.length) {
      // tool_choice: "required" should prevent this, but models occasionally still reply in
      // plain text — treat that text as the reply instead of discarding it.
      const content = choice.content?.trim();
      if (content) {
        return { reply: content, thinking_seconds: 5 };
      }
      break;
    }

    let finalReply: { reply: string; thinking_seconds: number } | null = null;

    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeParseArgs(call.function.arguments);
      if (call.function.name === "send_reply") {
        finalReply = {
          reply: String(args.reply ?? ""),
          thinking_seconds: Number(args.thinking_seconds ?? 3),
        };
      } else if ((MEMORY_TOOL_NAMES as readonly string[]).includes(call.function.name)) {
        await executeMemoryTool(call.function.name, args);
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ ok: true }),
      });
    }

    if (finalReply && finalReply.reply.trim()) {
      return finalReply;
    }
  }

  return FALLBACK_REPLY;
}

const FALLBACK_PROACTIVE_MESSAGE = "저 여기 있어요! 잘 지내고 계신가요?";

/** Used by the scheduler to phrase a proactive ping (선톡) in DOA's persona. No tool calls involved. */
export async function generateProactiveMessage(triggerReason: string): Promise<string> {
  const systemPrompt = await buildSystemPrompt();

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `[시스템 알림] 지금 유저에게 먼저 말을 걸어야 하는 상황이야. 이유: ${triggerReason}\n이 상황에 맞게 DOA의 말투로 짧게 먼저 말을 걸어줘. 도구 호출 없이 대사만 답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : FALLBACK_PROACTIVE_MESSAGE;
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
