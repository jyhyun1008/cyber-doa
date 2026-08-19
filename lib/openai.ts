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
 * gpt-5/o-series reasoning models reject temperature/frequency_penalty/presence_penalty
 * (400 "Unsupported parameter") — they use reasoning_effort instead. Non-reasoning models
 * (gpt-4o family etc.) don't support reasoning_effort, so the two are mutually exclusive.
 */
export function getSamplingParams(model: string = OPENAI_MODEL) {
  const isReasoningModel = /^(gpt-5|o1|o3|o4)/.test(model);
  return isReasoningModel
    ? ({ reasoning_effort: "minimal" } as const)
    : ({ temperature: 1.15, frequency_penalty: 0.4, presence_penalty: 0.3 } as const);
}

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
