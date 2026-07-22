"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useChatStream } from "@/hooks/useChatStream";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import InstallPrompt from "./InstallPrompt";

export default function ChatWindow() {
  const { messages, isTyping, loading, sendMessage } = useChatStream();
  const { permission, subscribed, subscribe, error: pushError } = usePushSubscription();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col lg:h-full lg:rounded-3xl lg:bg-white/60 lg:shadow-lg lg:shadow-doa-pink-100 lg:backdrop-blur">
      <header className="flex items-center justify-between gap-2 border-b border-doa-pink-100/60 bg-white/60 px-4 py-3 backdrop-blur lg:rounded-t-3xl lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-2 lg:hidden">
          <Image
            src="/doa-icon.png"
            alt="DOA"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border-2 border-white object-cover shadow"
          />
          <span className="font-[family-name:var(--font-cute-heading)] text-xl text-doa-pink-500">
            DOA
          </span>
        </div>
        <span className="hidden font-[family-name:var(--font-cute-heading)] text-lg text-doa-pink-500 lg:inline">
          DOA와의 대화
        </span>
        <div className="flex items-center gap-2 lg:hidden">
          {permission !== "unsupported" && !subscribed && (
            <button
              onClick={subscribe}
              className="rounded-full bg-white/80 px-3 py-1 text-xs text-doa-pink-500 shadow-sm"
            >
              알림 켜기
            </button>
          )}
          <InstallPrompt />
        </div>
      </header>

      {pushError && (
        <p className="bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-500 lg:hidden">
          {pushError}
        </p>
      )}

      <div className="scrollbar-cute flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-doa-ink/50">불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-doa-ink/50">
            DOA에게 첫 인사를 건네보세요!
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
