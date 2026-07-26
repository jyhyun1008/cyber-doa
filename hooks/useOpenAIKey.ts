"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "doa_openai_key";

export function useOpenAIKey() {
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    setApiKeyState(localStorage.getItem(STORAGE_KEY) || "");
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState("");
  }, []);

  return { apiKey, setApiKey, clearApiKey };
}

/** Reads the stored key directly (for non-hook contexts like a plain fetch call). */
export function getStoredOpenAIKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}
