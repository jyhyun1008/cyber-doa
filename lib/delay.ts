const MIN_SECONDS = 1;
const MAX_SECONDS = 60;
const SHORT_REPLY_CHAR_LIMIT = 15;
const SHORT_REPLY_MAX_SECONDS = 3;

export function resolveThinkingDelaySeconds(reply: string, thinkingSecondsHint: number): number {
  const clamped = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(thinkingSecondsHint)));
  if (reply.trim().length <= SHORT_REPLY_CHAR_LIMIT) {
    return Math.min(clamped, SHORT_REPLY_MAX_SECONDS);
  }
  return clamped;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
