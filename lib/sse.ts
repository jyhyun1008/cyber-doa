import { EventEmitter } from "node:events";

export type ChatEvent =
  | { type: "typing:start" }
  | { type: "typing:stop" }
  | {
      type: "message:new";
      message: {
        id: string;
        role: string;
        content: string;
        source: string;
        createdAt: string;
      };
    };

const globalForEmitter = globalThis as unknown as { doaEmitter?: EventEmitter };

export const chatEmitter =
  globalForEmitter.doaEmitter ?? new EventEmitter().setMaxListeners(50);

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.doaEmitter = chatEmitter;
}

const CHANNEL = "chat-event";

export function broadcastChatEvent(event: ChatEvent) {
  chatEmitter.emit(CHANNEL, event);
}

export function subscribeToChatEvents(listener: (event: ChatEvent) => void) {
  chatEmitter.on(CHANNEL, listener);
  return () => chatEmitter.off(CHANNEL, listener);
}
