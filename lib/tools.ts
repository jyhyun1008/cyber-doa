import type OpenAI from "openai";
import { prisma } from "./db";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** Converts Korean day-name labels (e.g. ["월","화"]) to internal 0=Sun..6=Sat indices, stably sorted. */
function dayLabelsToIndices(labels: unknown[]): number[] {
  const indices = labels
    .map((l) => DAY_LABELS.indexOf(String(l) as (typeof DAY_LABELS)[number]))
    .filter((i) => i >= 0);
  return [...new Set(indices)].sort((a, b) => a - b);
}

/** Converts internal 0=Sun..6=Sat indices back to Korean day-name labels, for display to the model. */
export function dayIndicesToLabels(indices: number[]): string {
  return indices
    .filter((i) => i >= 0 && i <= 6)
    .map((i) => DAY_LABELS[i])
    .join(",");
}

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_user_profile",
      strict: true,
      description:
        "유저의 성격, 취향, 좋아하는 것/기분 좋아지는 것, 요즘 관심사나 사는 모습처럼 '사람 자체'에 대해 새롭게 알게 된 게 있을 때 호출. 할 일/일정/루틴처럼 이미 별도로 저장되는 항목은 여기 넣지 마. 기존 프로필을 대체할 새로운 전체 텍스트(긴 줄글)를 전달.",
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
      name: "add_bucket_item",
      strict: true,
      description:
        "유저가 언젠가 해보고 싶다고 말한 일을 버킷리스트에 추가(할 일 목록과는 다름 — 마감이나 급한 일정이 없는 막연한 소망/하고 싶은 일).",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_bucket_item",
      strict: true,
      description: "유저가 버킷리스트에 있던 걸 이미 해냈다고 말하면 완료 처리해서 목록에서 지움.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "완료할 버킷리스트 항목 제목(위 버킷리스트 참고)" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_bucket_item",
      strict: true,
      description: "유저가 더 이상 하고 싶지 않다고 하거나 취소한 버킷리스트 항목을 삭제.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "삭제할 버킷리스트 항목 제목(위 버킷리스트 참고)" } },
        required: ["title"],
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
            items: { type: "string", enum: ["일", "월", "화", "수", "목", "금", "토"] },
            description: "루틴이 실행될 요일 목록(한글 요일명 그대로). 매일이면 [\"일\",\"월\",\"화\",\"수\",\"목\",\"금\",\"토\"]",
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
      name: "complete_todo",
      strict: true,
      description: "유저가 이미 끝냈다고 말한 할 일을 완료 처리해서 목록에서 지움. title로 기존 할 일을 찾아서 처리.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "완료할 할 일의 제목(위 할 일 목록 참고)" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      strict: true,
      description: "유저가 더 이상 안 하겠다고 하거나 취소한 할 일을 목록에서 삭제.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "삭제할 할 일의 제목(위 할 일 목록 참고)" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_schedule",
      strict: true,
      description:
        "이미 등록된 1회성 일정의 시간이나 제목을 변경. title로 기존 일정을 찾아서 수정. newScheduledAt/newTitle 중 바꿀 값만 채우고 나머지는 null.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "변경할 기존 일정의 제목(위 예정된 일정 참고)" },
          newScheduledAt: {
            type: ["string", "null"],
            description: "새 시각, ISO 8601 +09:00(KST) 오프셋 포함. 안 바꾸면 null.",
          },
          newTitle: { type: ["string", "null"], description: "새 제목. 안 바꾸면 null." },
        },
        required: ["title", "newScheduledAt", "newTitle"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_schedule",
      strict: true,
      description: "유저가 취소하거나 없던 일로 하자고 한 1회성 일정을 삭제.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "취소할 일정의 제목(위 예정된 일정 참고)" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_routine",
      strict: true,
      description:
        "이미 등록된 반복 루틴의 요일/시간/제목을 변경(예: '일요일 빼줘', '매일 하던 거 평일에만 하게 해줘', '시간 8시로 바꿔줘'). title로 기존 루틴을 찾아서 수정. 바꿀 값만 채우고 나머지는 null.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "변경할 기존 루틴의 제목(위 반복 루틴 참고)" },
          newDaysOfWeek: {
            type: ["array", "null"],
            items: { type: "string", enum: ["일", "월", "화", "수", "목", "금", "토"] },
            description:
              "바뀐 뒤 남아야 할 요일 전체 목록(한글 요일명). 안 바꾸면 null. 예: 매일 하던 걸 일요일만 빼려면 [\"월\",\"화\",\"수\",\"목\",\"금\",\"토\"](일요일 제외 나머지 전부).",
          },
          newTime: { type: ["string", "null"], description: "새 시각 HH:mm. 안 바꾸면 null." },
          newTitle: { type: ["string", "null"], description: "새 제목. 안 바꾸면 null." },
        },
        required: ["title", "newDaysOfWeek", "newTime", "newTitle"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_routine",
      strict: true,
      description: "유저가 그만하겠다고 하거나 취소한 반복 루틴을 삭제.",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "삭제할 루틴의 제목(위 반복 루틴 참고)" } },
        required: ["title"],
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
  "add_bucket_item",
  "complete_bucket_item",
  "delete_bucket_item",
  "add_routine",
  "add_schedule",
  "complete_todo",
  "delete_todo",
  "update_schedule",
  "cancel_schedule",
  "update_routine",
  "delete_routine",
] as const;

function sameTitle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function findBestTitleMatch<T extends { title: string }>(items: T[], title: string): T | undefined {
  const norm = title.trim().toLowerCase();
  if (!norm) return undefined;
  return (
    items.find((i) => sameTitle(i.title, title)) ??
    items.find((i) => i.title.toLowerCase().includes(norm) || norm.includes(i.title.toLowerCase()))
  );
}

export async function executeMemoryTool(userId: string, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "update_user_profile": {
      const profile = String(args.profile ?? "");
      await prisma.appUser.update({ where: { id: userId }, data: { profile } });
      return { ok: true };
    }
    case "add_todo": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };

      const existing = await prisma.todo.findMany({ where: { userId, isDone: false } });
      if (existing.some((t) => sameTitle(t.title, title))) {
        return { ok: true, skipped: "already exists" };
      }

      const deadline = args.deadline ? new Date(String(args.deadline)) : null;
      await prisma.todo.create({
        data: { userId, title, deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null },
      });
      return { ok: true };
    }
    case "add_bucket_item": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };

      const existing = await prisma.bucketItem.findMany({ where: { userId, isDone: false } });
      if (existing.some((b) => sameTitle(b.title, title))) {
        return { ok: true, skipped: "already exists" };
      }

      await prisma.bucketItem.create({ data: { userId, title } });
      return { ok: true };
    }
    case "complete_bucket_item": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const open = await prisma.bucketItem.findMany({ where: { userId, isDone: false } });
      const match = findBestTitleMatch(open, title);
      if (!match) return { ok: false, error: "matching bucket item not found" };
      await prisma.bucketItem.updateMany({ where: { id: match.id, userId }, data: { isDone: true } });
      return { ok: true };
    }
    case "delete_bucket_item": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const open = await prisma.bucketItem.findMany({ where: { userId, isDone: false } });
      const match = findBestTitleMatch(open, title);
      if (!match) return { ok: false, error: "matching bucket item not found" };
      await prisma.bucketItem.deleteMany({ where: { id: match.id, userId } });
      return { ok: true };
    }
    case "add_routine": {
      const title = String(args.title ?? "").trim();
      const daysOfWeek = Array.isArray(args.daysOfWeek) ? dayLabelsToIndices(args.daysOfWeek) : [];
      const time = String(args.time ?? "").trim();
      if (!title || !daysOfWeek.length || !/^\d{2}:\d{2}$/.test(time)) {
        return { ok: false, error: "invalid routine arguments" };
      }

      const existing = await prisma.routine.findMany({ where: { userId } });
      if (existing.some((r) => sameTitle(r.title, title))) {
        return { ok: true, skipped: "already exists" };
      }

      await prisma.routine.create({
        data: { userId, title, daysOfWeek: JSON.stringify(daysOfWeek), time },
      });
      return { ok: true };
    }
    case "add_schedule": {
      const title = String(args.title ?? "").trim();
      const scheduledAt = new Date(String(args.scheduledAt ?? ""));
      if (!title || isNaN(scheduledAt.getTime())) {
        return { ok: false, error: "invalid schedule arguments" };
      }

      const existing = await prisma.schedule.findMany({ where: { userId, isSent: false } });
      const isDuplicate = existing.some(
        (s) => sameTitle(s.title, title) && Math.abs(s.scheduledAt.getTime() - scheduledAt.getTime()) < 5 * 60_000
      );
      if (isDuplicate) {
        return { ok: true, skipped: "already exists" };
      }

      await prisma.schedule.create({ data: { userId, title, scheduledAt } });
      return { ok: true };
    }
    case "complete_todo": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const open = await prisma.todo.findMany({ where: { userId, isDone: false } });
      const match = findBestTitleMatch(open, title);
      if (!match) return { ok: false, error: "matching todo not found" };
      await prisma.todo.updateMany({ where: { id: match.id, userId }, data: { isDone: true } });
      return { ok: true };
    }
    case "delete_todo": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const open = await prisma.todo.findMany({ where: { userId, isDone: false } });
      const match = findBestTitleMatch(open, title);
      if (!match) return { ok: false, error: "matching todo not found" };
      await prisma.todo.deleteMany({ where: { id: match.id, userId } });
      return { ok: true };
    }
    case "update_schedule": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const pending = await prisma.schedule.findMany({ where: { userId, isSent: false } });
      const match = findBestTitleMatch(pending, title);
      if (!match) return { ok: false, error: "matching schedule not found" };

      const data: { title?: string; scheduledAt?: Date } = {};
      if (args.newTitle) data.title = String(args.newTitle).trim();
      if (args.newScheduledAt) {
        const newDate = new Date(String(args.newScheduledAt));
        if (!isNaN(newDate.getTime())) data.scheduledAt = newDate;
      }
      if (!Object.keys(data).length) return { ok: false, error: "nothing to update" };

      await prisma.schedule.updateMany({ where: { id: match.id, userId }, data });
      return { ok: true };
    }
    case "cancel_schedule": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const pending = await prisma.schedule.findMany({ where: { userId, isSent: false } });
      const match = findBestTitleMatch(pending, title);
      if (!match) return { ok: false, error: "matching schedule not found" };
      await prisma.schedule.deleteMany({ where: { id: match.id, userId } });
      return { ok: true };
    }
    case "update_routine": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const routines = await prisma.routine.findMany({ where: { userId } });
      const match = findBestTitleMatch(routines, title);
      if (!match) return { ok: false, error: "matching routine not found" };

      const data: { title?: string; time?: string; daysOfWeek?: string } = {};
      if (args.newTitle) data.title = String(args.newTitle).trim();
      if (args.newTime) {
        const time = String(args.newTime).trim();
        if (/^\d{2}:\d{2}$/.test(time)) data.time = time;
      }
      if (Array.isArray(args.newDaysOfWeek)) {
        const days = dayLabelsToIndices(args.newDaysOfWeek);
        if (days.length) data.daysOfWeek = JSON.stringify(days);
      }
      if (!Object.keys(data).length) return { ok: false, error: "nothing to update" };

      await prisma.routine.updateMany({ where: { id: match.id, userId }, data });
      return { ok: true };
    }
    case "delete_routine": {
      const title = String(args.title ?? "").trim();
      if (!title) return { ok: false, error: "title is required" };
      const routines = await prisma.routine.findMany({ where: { userId } });
      const match = findBestTitleMatch(routines, title);
      if (!match) return { ok: false, error: "matching routine not found" };
      await prisma.routine.deleteMany({ where: { id: match.id, userId } });
      return { ok: true };
    }
    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}
