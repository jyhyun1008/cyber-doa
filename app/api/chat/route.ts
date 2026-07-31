import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { broadcastChatEvent } from "@/lib/sse";
import { generateAssistantReply } from "@/lib/llmReply";
import { resolveThinkingDelaySeconds, sleep } from "@/lib/delay";

const HISTORY_LIMIT_FOR_LLM = 20;

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const cursor = searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // optional bring-your-own-key: sent per-request from the browser (localStorage), never persisted
  const apiKey = request.headers.get("x-openai-key");

  // the owner keeps using the shared server key by default; everyone else must bring their own
  if (!apiKey) {
    const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { isOwner: true } });
    if (!user?.isOwner) {
      return NextResponse.json({ error: "api_key_required" }, { status: 400 });
    }
  }

  const userMessage = await prisma.message.create({
    data: { userId, role: "user", content: text, source: "chat" },
  });

  // broadcast so any OTHER open tab/device on this account sees this message too — the sending
  // device already has it optimistically via sendMessage(), and dedupes by id when this echoes back
  broadcastChatEvent(userId, {
    type: "message:new",
    message: {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      source: userMessage.source,
      confirmed: userMessage.confirmed,
      createdAt: userMessage.createdAt.toISOString(),
    },
  });

  await prisma.appUser.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });

  handleReply(userId, apiKey).catch((err) => {
    console.error("[chat] reply pipeline failed", err);
    broadcastChatEvent(userId, { type: "typing:stop" });
  });

  return NextResponse.json({ userMessageId: userMessage.id });
}

async function handleReply(userId: string, apiKey: string | null) {
  broadcastChatEvent(userId, { type: "typing:start" });

  const recent = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT_FOR_LLM,
  });
  const history = recent
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content, createdAt: m.createdAt }));

  const { reply, thinking_seconds } = await generateAssistantReply(userId, history, apiKey);
  const delaySeconds = resolveThinkingDelaySeconds(reply, thinking_seconds);
  await sleep(delaySeconds * 1000);

  const assistantMessage = await prisma.message.create({
    data: {
      userId,
      role: "assistant",
      content: reply,
      source: "chat",
      thinkingSeconds: delaySeconds,
    },
  });

  broadcastChatEvent(userId, {
    type: "message:new",
    message: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      source: assistantMessage.source,
      confirmed: assistantMessage.confirmed,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
  });
}
