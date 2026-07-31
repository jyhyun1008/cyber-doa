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
        confirmed: boolean;
        createdAt: string;
      };
    };

const globalForEmitter = globalThis as unknown as { doaEmitter?: EventEmitter };

export const chatEmitter =
  globalForEmitter.doaEmitter ?? new EventEmitter().setMaxListeners(50);

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.doaEmitter = chatEmitter;
}

function channelFor(userId: string) {
  return `chat-event:${userId}`;
}

export function broadcastChatEvent(userId: string, event: ChatEvent) {
  chatEmitter.emit(channelFor(userId), event);
}

export function subscribeToChatEvents(userId: string, listener: (event: ChatEvent) => void) {
  chatEmitter.on(channelFor(userId), listener);
  return () => chatEmitter.off(channelFor(userId), listener);
}
