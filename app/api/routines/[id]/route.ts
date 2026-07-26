import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;

  if (isActive === undefined) {
    return NextResponse.json({ error: "isActive is required" }, { status: 400 });
  }

  const result = await prisma.routine.updateMany({ where: { id, userId }, data: { isActive } });
  return NextResponse.json({ ok: result.count > 0 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.routine.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: result.count > 0 });
}
