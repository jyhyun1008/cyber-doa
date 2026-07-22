import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openaiClient?: OpenAI };

export const openai =
  globalForOpenAI.openaiClient ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-not-configured" });

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openaiClient = openai;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
