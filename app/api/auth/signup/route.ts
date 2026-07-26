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

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (settings && !settings.signupEnabled) {
    return NextResponse.json({ error: "signup closed" }, { status: 403 });
  }

  const existing = await prisma.appUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "username taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.appUser.create({ data: { username, passwordHash } });

  const token = await createSessionToken(user.id);
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
