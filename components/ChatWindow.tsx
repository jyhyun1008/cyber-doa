"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { useChatStream } from "@/hooks/useChatStream";
import { useMobileMenu } from "@/contexts/MobileMenuContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useOpenAIKey } from "@/hooks/useOpenAIKey";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

export default function ChatWindow() {
  const { messages, isTyping, loading, sendMessage, loadMore, hasMore, loadingMore, confirmMessage } =
    useChatStream();
  const { openMenu } = useMobileMenu();
  const { settings } = useAppSettings();
  const { apiKey } = useOpenAIKey();
  const needsApiKey = settings != null && !settings.isOwner && !apiKey;
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number | null>(null);

  useEffect(() => {
    if (prevScrollHeight.current !== null) return; // an older-messages load is about to run its own scroll fixup
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // keep the viewport anchored on the same message after older ones are prepended, instead of
  // jumping to the top (the natural result of content being inserted above the scroll position)
  useLayoutEffect(() => {
    if (prevScrollHeight.current === null || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop += el.scrollHeight - prevScrollHeight.current;
    prevScrollHeight.current = null;
  }, [messages]);

  function handleLoadMore() {
    if (scrollRef.current) prevScrollHeight.current = scrollRef.current.scrollHeight;
    loadMore();
  }

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
        <button
          onClick={openMenu}
          aria-label="메뉴 열기"
          className="rounded-full bg-white/80 p-2 text-doa-pink-500 shadow-sm lg:hidden"
        >
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </button>
      </header>

      <div ref={scrollRef} className="scrollbar-cute flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-doa-ink/50">불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-doa-ink/50">
            DOA에게 첫 인사를 건네보세요!
          </p>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-1">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-doa-pink-500 shadow-sm hover:bg-white disabled:opacity-50"
                >
                  {loadingMore ? "불러오는 중..." : "이전 대화 불러오기"}
                </button>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onToggleConfirm={confirmMessage} />
            ))}
          </>
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {needsApiKey ? (
        <div className="mx-3 mb-3 rounded-2xl bg-doa-pink-100/70 px-4 py-3 text-center text-xs text-doa-ink/70">
          채팅하려면 사이드바에서 내 OpenAI API 키를 먼저 입력해주세요.
        </div>
      ) : (
        <ChatInput onSend={sendMessage} />
      )}
    </div>
  );
}
