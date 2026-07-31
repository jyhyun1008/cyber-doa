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

export default function MessageBubble({
  message,
  onToggleConfirm,
}: {
  message: ChatMessage;
  onToggleConfirm?: (id: string, confirmed: boolean) => void;
}) {
  const isUser = message.role === "user";
  const isConfirmable = message.role === "assistant" && message.source === "proactive";

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
        <span className="flex items-center gap-1.5 px-1 text-[10px] text-doa-ink/40">
          {formatTime(message.createdAt)}
          {isConfirmable && (
            <button
              onClick={() => onToggleConfirm?.(message.id, !message.confirmed)}
              aria-label={message.confirmed ? "확인 취소" : "확인했어요"}
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors ${
                message.confirmed
                  ? "bg-doa-pink-100 text-doa-pink-500"
                  : "bg-doa-ink/5 text-doa-ink/40 hover:bg-doa-ink/10"
              }`}
            >
              <span
                className={`flex h-3 w-3 items-center justify-center rounded-sm border text-[8px] leading-none ${
                  message.confirmed ? "border-doa-pink-500 bg-doa-pink-500 text-white" : "border-doa-ink/30"
                }`}
              >
                ✓
              </span>
              확인
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
