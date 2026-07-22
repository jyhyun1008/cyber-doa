import { prisma } from "../lib/db";
import { sendWebPushToAll } from "../lib/push";

export async function triggerProactiveMessage(text: string) {
  const message = await prisma.message.create({
    data: { role: "assistant", content: text, source: "proactive" },
  });

  await sendWebPushToAll({ title: "DOA", body: text, url: "/" }).catch((err) => {
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
  }).catch((err) => {
    console.error("[scheduler] internal broadcast failed", err);
  });

  console.log(`[scheduler] proactive message sent: ${text}`);
  return message;
}
