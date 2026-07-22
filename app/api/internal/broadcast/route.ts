import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastChatEvent } from "@/lib/sse";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const messageId = body?.messageId as string | undefined;
  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: "message not found" }, { status: 404 });
  }

  broadcastChatEvent({
    type: "message:new",
    message: {
      id: message.id,
      role: message.role,
      content: message.content,
      source: message.source,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
