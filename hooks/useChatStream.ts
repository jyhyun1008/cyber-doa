"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const knownIds = useRef<Set<string>>(new Set());

  const addMessage = useCallback((message: ChatMessage) => {
    if (knownIds.current.has(message.id)) return;
    knownIds.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/chat?limit=50");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      for (const m of data.messages as ChatMessage[]) {
        knownIds.current.add(m.id);
      }
      if (!cancelled) {
        setMessages(data.messages);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) return;
      const data = await res.json();
      addMessage({
        id: data.userMessageId,
        role: "user",
        content: trimmed,
        source: "chat",
        createdAt: new Date().toISOString(),
      });
    },
    [addMessage]
  );

  return { messages, isTyping, loading, sendMessage };
}
