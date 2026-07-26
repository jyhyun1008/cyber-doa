"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setSettings(await res.json());
    } catch {
      // ignore transient fetch failures
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSignup = useCallback(
    async (next: boolean) => {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signupEnabled: next }),
      });
      load();
    },
    [load]
  );

  return { settings, toggleSignup };
}
