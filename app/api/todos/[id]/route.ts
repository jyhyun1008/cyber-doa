import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isDone = typeof body?.isDone === "boolean" ? body.isDone : undefined;

  if (isDone === undefined) {
    return NextResponse.json({ error: "isDone is required" }, { status: 400 });
  }

  const result = await prisma.todo.updateMany({
    where: { id, userId },
    data: { isDone, completedAt: isDone ? new Date() : null },
  });
  return NextResponse.json({ ok: result.count > 0 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.todo.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: result.count > 0 });
}
