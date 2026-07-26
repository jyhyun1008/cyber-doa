import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openaiClient?: OpenAI };

export const openai =
  globalForOpenAI.openaiClient ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-not-configured" });

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openaiClient = openai;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Returns a one-off OpenAI client using the caller's own key when provided (bring-your-own-key
 * chat usage — the key is never persisted, only passed through per-request), otherwise falls
 * back to the shared server-side client (also always used for scheduler/proactive messages).
 */
export function getOpenAIClient(customApiKey?: string | null): OpenAI {
  if (customApiKey && customApiKey.trim()) {
    return new OpenAI({ apiKey: customApiKey.trim() });
  }
  return openai;
}
