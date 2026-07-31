"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";
import { getStoredOpenAIKey } from "./useOpenAIKey";

const PAGE_SIZE = 50;

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  const addMessage = useCallback((message: ChatMessage) => {
    if (knownIds.current.has(message.id)) return;
    knownIds.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/chat?limit=${PAGE_SIZE}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      for (const m of data.messages as ChatMessage[]) {
        knownIds.current.add(m.id);
      }
      if (!cancelled) {
        setMessages(data.messages);
        setHasMore(data.messages.length === PAGE_SIZE);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoadingMore(true);
    const res = await fetch(`/api/chat?limit=${PAGE_SIZE}&cursor=${oldest.id}`);
    if (!res.ok) {
      setLoadingMore(false);
      return;
    }
    const data = await res.json();
    const older = (data.messages as ChatMessage[]).filter((m) => !knownIds.current.has(m.id));
    for (const m of older) knownIds.current.add(m.id);
    setHasMore(data.messages.length === PAGE_SIZE);
    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, messages]);

  useEffect(() => {
    const source = new EventSource("/api/chat/stream");

    source.addEventListener("typing:start", () => setIsTyping(true));
    source.addEventListener("typing:stop", () => setIsTyping(false));
    source.addEventListener("message:new", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setIsTyping(false);
      addMessage(data.message);
    });

    return () => source.close();
  }, [addMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const apiKey = getStoredOpenAIKey();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { "x-openai-key": apiKey } : {}),
        },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) return;
      const data = await res.json();
      addMessage({
        id: data.userMessageId,
        role: "user",
        content: trimmed,
        source: "chat",
        confirmed: false,
        createdAt: new Date().toISOString(),
      });
    },
    [addMessage]
  );

  const confirmMessage = useCallback(async (id: string, confirmed: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, confirmed } : m)));
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed }),
    });
  }, []);

  return { messages, isTyping, loading, sendMessage, loadMore, hasMore, loadingMore, confirmMessage };
}
