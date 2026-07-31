import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isCompleted = typeof body?.isCompleted === "boolean" ? body.isCompleted : undefined;

  if (isCompleted === undefined) {
    return NextResponse.json({ error: "isCompleted is required" }, { status: 400 });
  }

  const result = await prisma.schedule.updateMany({ where: { id, userId }, data: { isCompleted } });
  return NextResponse.json({ ok: result.count > 0 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.schedule.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: result.count > 0 });
}
