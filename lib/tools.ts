import type OpenAI from "openai";
import { prisma } from "./db";

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_user_profile",
      strict: true,
      description:
        "유저에 대해 새롭게 알게 되었거나 갱신할 정보가 있을 때 호출. 기존 프로필을 대체할 새로운 전체 텍스트(긴 줄글)를 전달.",
      parameters: {
        type: "object",
        properties: { profile: { type: "string" } },
        required: ["profile"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      strict: true,
      description: "유저가 앞으로 하려고 계획 중인 일을 할 일 목록에 추가.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          deadline: {
            type: ["string", "null"],
            description: "마감일이 있으면 ISO 8601 datetime(+09:00 KST 오프셋 포함, UTC/Z 금지), 없으면 null",
          },
        },
        required: ["title", "deadline"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_routine",
      strict: true,
      description: "매일 또는 특정 요일에 반복되는 루틴을 등록.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          daysOfWeek: {
            type: "array",
            items: { type: "integer", minimum: 0, maximum: 6 },
            description: "0=일요일 .. 6=토요일. 매일이면 [0,1,2,3,4,5,6]",
          },
          time: { type: "string", description: "24시간 형식 HH:mm" },
        },
        required: ["title", "daysOfWeek", "time"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_schedule",
      strict: true,
      description:
        "반복되지 않는 1회성 특정 일정을 등록. '4시간 후'처럼 상대적인 시간 표현은 현재 시각 기준 절대 시각으로 계산해서 전달.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          scheduledAt: {
            type: "string",
            description: "ISO 8601 절대 datetime, 반드시 +09:00(KST) 오프셋 포함. UTC/Z 금지.",
          },
        },
        required: ["title", "scheduledAt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_reply",
      strict: true,
      description:
        "유저에게 실제로 보낼 최종 답장. 이번 턴에 반드시 정확히 한 번 호출해야 함(다른 툴 호출 여부와 무관하게 마지막에 호출).",
      parameters: {
        type: "object",
        properties: {
          reply: { type: "string" },
          thinking_seconds: {
            type: "integer",
            minimum: 1,
            maximum: 60,
            description:
              "이 답장을 하기까지 고민한 시간(초). 간단한 대답은 짧게(1~3), 복잡하거나 신중한 답은 길게(최대 60)",
          },
        },
        required: ["reply", "thinking_seconds"],
        additionalProperties: false,
      },
    },
  },
];

export const MEMORY_TOOL_NAMES = [
  "update_user_profile",
  "add_todo",
  "add_routine",
  "add_schedule",
] as const;

function sameTitle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function executeMemoryTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "update_user_profile": {
      const profile = String(args.profile ?? "");
      await prisma.appUser.upsert({
        where: { id: 1 },
        update: { profile },
        create: { id: 1, profile },
      });
      return { ok: true };
    }
    case "add_todo": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };

      const existing = await prisma.todo.findMany({ where: { isDone: false } });
      if (existing.some((t) => sameTitle(t.title, title))) {
        return { ok: true, skipped: "already exists" };
      }

      const deadline = args.deadline ? new Date(String(args.deadline)) : null;
      await prisma.todo.create({
        data: { title, deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null },
      });
      return { ok: true };
    }
    case "add_routine": {
      const title = String(args.title ?? "").trim();
      const daysOfWeek = Array.isArray(args.daysOfWeek)
        ? (args.daysOfWeek as unknown[]).map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
        : [];
      const time = String(args.time ?? "").trim();
      if (!title || !daysOfWeek.length || !/^\d{2}:\d{2}$/.test(time)) {
        return { ok: false, error: "invalid routine arguments" };
      }

      const existing = await prisma.routine.findMany();
      if (existing.some((r) => sameTitle(r.title, title))) {
        return { ok: true, skipped: "already exists" };
      }

      await prisma.routine.create({
        data: { title, daysOfWeek: JSON.stringify(daysOfWeek), time },
      });
      return { ok: true };
    }
    case "add_schedule": {
      const title = String(args.title ?? "").trim();
      const scheduledAt = new Date(String(args.scheduledAt ?? ""));
      if (!title || isNaN(scheduledAt.getTime())) {
        return { ok: false, error: "invalid schedule arguments" };
      }

      const existing = await prisma.schedule.findMany({ where: { isSent: false } });
      const isDuplicate = existing.some(
        (s) => sameTitle(s.title, title) && Math.abs(s.scheduledAt.getTime() - scheduledAt.getTime()) < 5 * 60_000
      );
      if (isDuplicate) {
        return { ok: true, skipped: "already exists" };
      }

      await prisma.schedule.create({ data: { title, scheduledAt } });
      return { ok: true };
    }
    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}
