import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const account = await prisma.appUser.findUnique({ where: { id: 1 } });
  if (!account?.passwordHash) {
    return NextResponse.json({ error: "account not set up yet" }, { status: 409 });
  }

  const isValid = Boolean(
    username &&
      password &&
      username === account.username &&
      (await bcrypt.compare(password, account.passwordHash))
  );

  if (!isValid) {
    return NextResponse.json({ error: "invalid username or password" }, { status: 401 });
  }

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
