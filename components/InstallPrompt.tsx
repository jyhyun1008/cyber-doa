"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredEvent) return null;

  return (
    <button
      onClick={async () => {
        await deferredEvent.prompt();
        setDeferredEvent(null);
      }}
      className="rounded-full bg-white/80 px-3 py-1 text-xs text-doa-pink-500 shadow-sm"
    >
      홈 화면에 추가
    </button>
  );
}
