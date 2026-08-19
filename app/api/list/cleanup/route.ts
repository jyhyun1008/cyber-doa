import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Bulk-deletes todos/bucket items that were marked done more than 24h ago (/list "정리" button). */
export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - ONE_DAY_MS);
  const staleCompleted = { userId, isDone: true, completedAt: { lt: cutoff } };

  const [todos, bucketItems] = await Promise.all([
    prisma.todo.deleteMany({ where: staleCompleted }),
    prisma.bucketItem.deleteMany({ where: staleCompleted }),
  ]);

  return NextResponse.json({ ok: true, deletedCount: todos.count + bucketItems.count });
}
