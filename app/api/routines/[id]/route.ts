import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;

  if (isActive === undefined) {
    return NextResponse.json({ error: "isActive is required" }, { status: 400 });
  }

  await prisma.routine.update({ where: { id }, data: { isActive } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.routine.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
