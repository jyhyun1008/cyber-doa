import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const confirmed = typeof body?.confirmed === "boolean" ? body.confirmed : undefined;

  if (confirmed === undefined) {
    return NextResponse.json({ error: "confirmed is required" }, { status: 400 });
  }

  const result = await prisma.message.updateMany({ where: { id, userId }, data: { confirmed } });
  return NextResponse.json({ ok: result.count > 0 });
}
