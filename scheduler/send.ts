import { prisma } from "../lib/db";
import { sendWebPushToUser } from "../lib/push";

export async function triggerProactiveMessage(userId: string, text: string) {
  const message = await prisma.message.create({
    data: { userId, role: "assistant", content: text, source: "proactive" },
  });

  await sendWebPushToUser(userId, { title: "DOA", body: text, url: "/" }).catch((err: unknown) => {
    console.error("[scheduler] web push failed", err);
  });

  const baseUrl = process.env.INTERNAL_BASE_URL || "http://localhost:3000";
  await fetch(`${baseUrl}/api/internal/broadcast`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
    },
    body: JSON.stringify({ messageId: message.id }),
  }).catch((err: unknown) => {
    console.error("[scheduler] internal broadcast failed", err);
  });

  console.log(`[scheduler] proactive message sent to ${userId}: ${text}`);
  return message;
}
