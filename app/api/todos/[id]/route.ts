import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isDone = typeof body?.isDone === "boolean" ? body.isDone : undefined;

  if (isDone === undefined) {
    return NextResponse.json({ error: "isDone is required" }, { status: 400 });
  }

  await prisma.todo.update({ where: { id }, data: { isDone } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.todo.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
