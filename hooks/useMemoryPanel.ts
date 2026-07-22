"use client";

import { useEffect, useState } from "react";
import type { MemorySnapshot } from "@/types";

const REFRESH_INTERVAL_MS = 20_000;

export function useMemoryPanel() {
  const [data, setData] = useState<MemorySnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/memory");
        if (!res.ok || cancelled) return;
        setData(await res.json());
      } catch {
        // ignore transient fetch failures, next interval retries
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return data;
}
