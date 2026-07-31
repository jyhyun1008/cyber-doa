"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "doa_openai_key";
// same-tab cross-instance sync: the native "storage" event only fires in OTHER tabs, so a
// component like Sidebar saving a key wouldn't otherwise notify ChatWindow's separate hook
// instance in the same tab without a reload.
const CHANGE_EVENT = "doa-openai-key-changed";

export function useOpenAIKey() {
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    setApiKeyState(localStorage.getItem(STORAGE_KEY) || "");
    const onChange = () => setApiKeyState(localStorage.getItem(STORAGE_KEY) || "");
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeyState(trimmed);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState("");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { apiKey, setApiKey, clearApiKey };
}

/** Reads the stored key directly (for non-hook contexts like a plain fetch call). */
export function getStoredOpenAIKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}
