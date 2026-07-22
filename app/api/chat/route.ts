import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastChatEvent } from "@/lib/sse";
import { generateAssistantReply } from "@/lib/llmReply";
import { resolveThinkingDelaySeconds, sleep } from "@/lib/delay";

const HISTORY_LIMIT_FOR_LLM = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const cursor = searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const userMessage = await prisma.message.create({
    data: { role: "user", content: text, source: "chat" },
  });

  await prisma.appUser.upsert({
    where: { id: 1 },
    update: { lastSeenAt: new Date() },
    create: { id: 1, lastSeenAt: new Date() },
  });

  handleReply().catch((err) => {
    console.error("[chat] reply pipeline failed", err);
    broadcastChatEvent({ type: "typing:stop" });
  });

  return NextResponse.json({ userMessageId: userMessage.id });
}

async function handleReply() {
  broadcastChatEvent({ type: "typing:start" });

  const recent = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT_FOR_LLM,
  });
  const history = recent
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const { reply, thinking_seconds } = await generateAssistantReply(history);
  const delaySeconds = resolveThinkingDelaySeconds(reply, thinking_seconds);
  await sleep(delaySeconds * 1000);

  const assistantMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content: reply,
      source: "chat",
      thinkingSeconds: delaySeconds,
    },
  });

  broadcastChatEvent({
    type: "message:new",
    message: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      source: assistantMessage.source,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
  });
}
