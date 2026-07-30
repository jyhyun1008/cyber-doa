"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemorySnapshot } from "@/types";

// SSE-driven refresh handles real-time updates (right after DOA adds/changes/removes something);
// this interval is just a slow fallback in case an event is ever missed.
const REFRESH_INTERVAL_MS = 60_000;

export function useMemoryPanel() {
  const [data, setData] = useState<MemorySnapshot | null>(null);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/memory");
      if (!res.ok || cancelledRef.current) return;
      setData(await res.json());
    } catch {
      // ignore transient fetch failures, next interval/manual refresh retries
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    // DOA's memory tool calls (add/complete/delete todo, routine, bucket item, schedule, ...)
    // happen server-side right before an assistant message is broadcast — refetch right then
    // instead of waiting for the next poll.
    const source = new EventSource("/api/chat/stream");
    source.addEventListener("message:new", () => load());
    return () => source.close();
  }, [load]);

  return { memory: data, refresh: load };
}
