import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [settings, user] = await Promise.all([
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.appUser.findUnique({ where: { id: userId }, select: { isOwner: true } }),
  ]);

  return NextResponse.json({ signupEnabled: settings.signupEnabled, isOwner: user?.isOwner ?? false });
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { isOwner: true } });
  if (!user?.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const signupEnabled = typeof body?.signupEnabled === "boolean" ? body.signupEnabled : undefined;
  if (signupEnabled === undefined) {
    return NextResponse.json({ error: "signupEnabled is required" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: { signupEnabled },
    create: { id: 1, signupEnabled },
  });

  return NextResponse.json({ signupEnabled: settings.signupEnabled });
}
