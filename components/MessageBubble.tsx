import Image from "next/image";
import type { ChatMessage } from "@/types";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <Image
          src="/doa-icon.png"
          alt="DOA"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover shadow"
        />
      )}
      <div className={`flex max-w-[75%] flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-3xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
            isUser
              ? "rounded-br-md bg-doa-blue-300 text-white"
              : "rounded-bl-md bg-white text-doa-ink"
          }`}
        >
          {message.content}
        </div>
        <span className="px-1 text-[10px] text-doa-ink/40">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
