import type OpenAI from "openai";
import { openai, getOpenAIClient, OPENAI_MODEL } from "./openai";
import { chatTools, executeMemoryTool, MEMORY_TOOL_NAMES, dayIndicesToLabels } from "./tools";
import { prisma } from "./db";
import { formatKoreanDateTime, isoKstOffset } from "./time";

export type ChatMessage = { role: "user" | "assistant"; content: string; createdAt: Date };

const LEADING_TIMESTAMP_TAG = /^\s*\[\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\]\s*/;

/** The model occasionally copies the "[M/D HH:mm]" context marker into its own reply — strip it if so. */
function stripLeadingTimestampTag(text: string): string {
  return text.replace(LEADING_TIMESTAMP_TAG, "");
}

function formatMessageTimestamp(date: Date): string {
  // "2026-07-22T14:23:00+09:00" -> "7/22 14:23"
  const match = isoKstOffset(date).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!match) return isoKstOffset(date);
  const [, , month, day, hhmm] = match;
  return `${Number(month)}/${Number(day)} ${hhmm}`;
}

const FALLBACK_REPLY = { reply: "음... 다시 한 번 말씀해 주실 수 있으세요?", thinking_seconds: 2 };

export async function buildSystemPrompt(userId: string): Promise<string> {
  const [user, todos, bucketItems, routines, schedules] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: userId } }),
    prisma.todo.findMany({ where: { userId, isDone: false }, orderBy: { deadline: "asc" }, take: 20 }),
    prisma.bucketItem.findMany({ where: { userId, isDone: false }, orderBy: { createdAt: "asc" }, take: 20 }),
    prisma.routine.findMany({ where: { userId, isActive: true }, take: 20 }),
    prisma.schedule.findMany({ where: { userId, isSent: false }, orderBy: { scheduledAt: "asc" }, take: 20 }),
  ]);

  const todoLines = todos.length
    ? todos
        .map((t) => `- ${t.title}${t.deadline ? ` (마감: ${isoKstOffset(t.deadline)})` : ""}`)
        .join("\n")
    : "(없음)";

  const bucketLines = bucketItems.length ? bucketItems.map((b) => `- ${b.title}`).join("\n") : "(없음)";

  const routineLines = routines.length
    ? routines
        .map((r) => `- ${r.title} (요일: ${dayIndicesToLabels(JSON.parse(r.daysOfWeek))}, ${r.time})`)
        .join("\n")
    : "(없음)";

  const scheduleLines = schedules.length
    ? schedules.map((s) => `- ${s.title} (${isoKstOffset(s.scheduledAt)})`).join("\n")
    : "(없음)";

  return `너는 "DOA"라는 이름을 가진 가상 메이드 캐릭터야. 유저의 말동무이자 개인 비서 역할을 해.

# 말투/성격
- 무조건 존댓말만 사용해. 반말은 절대 금지.
- 귀엽고 상냥한 메이드 같은 말투를 유지해줘. 다정한 존댓말 정도로.
- 유저를 부를 땐 "주인님" 같은 딱딱한 호칭 대신, 아래 "유저 이름"이나 "유저에 대해 알고 있는 정보"에 나온 실제 이름(또는 유저가 스스로 불러달라고 한 애칭)으로 불러줘. 이름을 모르면 호칭 없이 자연스럽게 말해.
- 답장 길이는 상황에 맞게 조절해. 가벼운 잡담이나 간단한 질문·대답은 한두 문장이면 충분해(장문 설명 피하기).
- 하지만 유저가 힘든 일, 고민, 속상한 감정처럼 진지한 이야기를 털어놓을 땐 한두 마디로 성의 없이 넘기지 마. 무슨 일인지 제대로 반응해주고, 필요하면 서너 문장 정도로 진심 어린 위로/공감을 해줘(그래도 장황하게 늘어놓지는 말고, 딱 필요한 만큼만).
- 대화는 보통 잡담, 신세한탄 들어주기, 심심풀이 상대야. 격식 차린 전문 상담처럼 굴 필요는 없지만, 진지한 얘기엔 진지하게 반응해줘.

# 현재 시각
${formatKoreanDateTime()} (ISO: ${isoKstOffset()})

# 유저 이름(로그인 아이디)
${user?.username ? user.username : "(모름)"}

# 유저에 대해 알고 있는 정보 (긴 줄글 메모, 유저가 스스로 불러달라고 한 이름/애칭이 있으면 여기 적혀있을 수 있음)
${user?.profile ? user.profile : "(아직 알고 있는 정보 없음)"}

# 유저의 할 일 목록 (마감/기한이 있는 실행할 일)
${todoLines}

# 유저의 버킷리스트 (마감 없이 언젠가 해보고 싶은 막연한 소망)
${bucketLines}

# 유저의 반복 루틴
${routineLines}

# 유저의 예정된 일정
${scheduleLines}

# 도구 사용 규칙
- 이번 유저 메시지에 새로 등장한 정보(새로운 할 일/루틴/일정, 새로 알게 된 유저 정보)가 있을 때만 해당 메모리 도구를 호출해.
- 위 "할 일 목록/반복 루틴/예정된 일정"에 이미 올라와 있는 항목은 절대 다시 add_todo/add_routine/add_schedule로 추가하지 마. 이미 저장된 내용은 그냥 참고만 하고, 유저가 이번에 새로 말하지 않았다면 손대지 마.
- 이번 턴에 새로 기억할 내용이 하나도 없으면 메모리 도구는 아예 호출하지 말고 send_reply만 호출해.
- update_user_profile을 호출할 때는 기존 정보에 새 정보를 자연스럽게 반영한 전체 텍스트를 다시 작성해서 전달해(기존 내용을 요약 없이 다 날리지 말고 이어서 갱신).
- 상대적 시간 표현(예: "4시간 후", "30분 후")은 위에 적힌 "현재 시각"의 ISO 값을 기준으로 정확히 더하거나 빼서 add_schedule에 전달해.
- add_schedule에 전달하는 scheduledAt은 반드시 위 "현재 시각" ISO와 같은 형식으로 "+09:00" 오프셋을 붙여서 전달해(예: "2026-07-22T13:58:00+09:00"). "Z"나 UTC로 변환하지 마 — 위에 보이는 시:분 숫자를 그대로 쓰고 끝에 +09:00만 붙이면 돼.
- 유저가 "그거 다 했어", "끝났어" 처럼 위 할 일 목록에 있는 항목을 완료했다고 하면 complete_todo를 호출해(목록에서 지우기만 하면 되고, 다시 add_todo로 추가하지 마). 안 하겠다고 취소하면 delete_todo를 호출해.
- 유저가 "언젠가 ~해보고 싶다", "죽기 전에 ~하고 싶어" 처럼 마감/기한 없이 막연히 하고 싶은 일을 말하면 add_todo가 아니라 add_bucket_item으로 버킷리스트에 넣어. 반대로 "~까지 해야 해", "~해야 하는데" 처럼 기한이 있거나 실행해야 하는 일은 add_todo(할 일)로 넣어. 버킷리스트 항목을 이뤘다고 하면 complete_bucket_item, 관두겠다고 하면 delete_bucket_item을 호출해.
- 유저가 위 예정된 일정의 시간이나 내용을 바꿔달라고 하면(예: "그 일정 1시간 미뤄줘", "일정 내일로 바꿔줘") update_schedule로 기존 항목을 수정해(새로 add_schedule 하지 말고). 아예 취소하면 cancel_schedule을 호출해.
- 유저가 위 반복 루틴의 요일/시간을 바꿔달라고 하면(예: "일요일은 빼줘", "주말엔 하지 마", "시간 8시로 바꿔줘") update_routine으로 기존 항목을 수정해(새로 add_routine 하지 말고). newDaysOfWeek에는 바뀐 뒤의 전체 요일 배열을 계산해서 전달해(예: 매일[0,1,2,3,4,5,6]에서 일요일 제외면 [1,2,3,4,5,6]). 아예 그만하겠다고 하면 delete_routine을 호출해.
- complete_todo/delete_todo/complete_bucket_item/delete_bucket_item/update_schedule/cancel_schedule/update_routine/delete_routine의 title은 위 목록에 있는 제목과 최대한 비슷하게 적어야 정확히 찾아져.
- 답장은 항상 이번 유저 메시지(가장 마지막 메시지)에 대한 반응이어야 해. 이전 턴에서 이미 한 말을 이유 없이 반복하지 마.
- 특히 조심할 것: 이전 턴에서 "~완료 처리했어요", "~로 바꿨어요" 처럼 뭔가 처리했다고 이미 확인해준 항목은, 이번 유저 메시지가 그 항목을 다시 언급하지 않는 이상 절대 다시 언급하지 마. "A도 완료했고 B도 바꿨어요" 식으로 예전에 한 일을 답장마다 계속 덧붙이지 마 — 이번 턴에 실제로 한 일에 대해서만 답해.
  예시: 직전 턴에 "A 할 일을 완료 처리했어요"라고 답했는데 이번 유저 메시지가 "B도 해줘"뿐이라면, 이번 답장은 B 얘기만 해("B도 처리했어요!"). "A도 완료했고 B도 처리했어요"처럼 A를 다시 끌어오면 틀린 답장이야.
- 대화 내역의 각 메시지 앞에는 "[월/일 시:분]" 형식으로 보낸 시각이 참고용으로 붙어 있어(이건 시스템이 붙인 메타데이터일 뿐, 유저가 실제로 쓴 말이 아니야). 마지막 유저 메시지와 그 전 메시지 사이에 시간이 많이 비었으면(몇 시간, 하루 이상 등) 자연스럽게 알아채고 반응해도 좋아(예: "오랜만이에요!"). 하지만 send_reply의 reply 값에는 "[월/일 시:분]" 같은 대괄호 표기를 절대 그대로 포함하지 마 — 자연스러운 문장으로만 답해.
- 답장을 할 때는 send_reply 도구를 사용해. 다른 메모리 도구를 호출했다면 그 다음에 이어서 send_reply도 호출해.
- thinking_seconds는 실제로 고민해야 할 만큼만 크게 잡아. 짧고 간단한 대답(예: "네!", "넵")은 1~3초, 복잡하거나 신중히 생각해야 하는 답은 최대 60초까지도 가능.`;
}

export async function generateAssistantReply(
  userId: string,
  history: ChatMessage[],
  apiKey?: string | null
): Promise<{ reply: string; thinking_seconds: number }> {
  const client = getOpenAIClient(apiKey);
  const systemPrompt = await buildSystemPrompt(userId);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map(
      (m) =>
        ({
          role: m.role,
          content: `[${formatMessageTimestamp(m.createdAt)}] ${m.content}`,
        }) as OpenAI.Chat.Completions.ChatCompletionMessageParam
    ),
  ];

  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: chatTools,
      tool_choice: "auto",
      parallel_tool_calls: true,
    });

    const choice = response.choices[0]?.message;
    if (!choice) break;
    messages.push(choice);

    if (!choice.tool_calls?.length) {
      // the model sometimes just answers directly without calling send_reply —
      // treat that text as the reply instead of discarding it.
      const content = choice.content?.trim();
      if (content) {
        return { reply: stripLeadingTimestampTag(content), thinking_seconds: 5 };
      }
      break;
    }

    let finalReply: { reply: string; thinking_seconds: number } | null = null;

    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeParseArgs(call.function.arguments);
      if (call.function.name === "send_reply") {
        finalReply = {
          reply: stripLeadingTimestampTag(String(args.reply ?? "")),
          thinking_seconds: Number(args.thinking_seconds ?? 3),
        };
      } else if ((MEMORY_TOOL_NAMES as readonly string[]).includes(call.function.name)) {
        await executeMemoryTool(userId, call.function.name, args);
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
export async function generateProactiveMessage(userId: string, triggerReason: string): Promise<string> {
  const systemPrompt = await buildSystemPrompt(userId);

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
