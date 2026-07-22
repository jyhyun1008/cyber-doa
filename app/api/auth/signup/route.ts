import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || password.length < 4) {
    return NextResponse.json(
      { error: "username is required and password must be at least 4 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.appUser.findUnique({ where: { id: 1 } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "account already set up" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.appUser.upsert({
    where: { id: 1 },
    update: { username, passwordHash },
    create: { id: 1, username, passwordHash },
  });

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
