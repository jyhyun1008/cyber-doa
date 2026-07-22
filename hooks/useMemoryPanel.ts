"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemorySnapshot } from "@/types";

const REFRESH_INTERVAL_MS = 20_000;

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

  return { memory: data, refresh: load };
}
