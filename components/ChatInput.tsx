"use client";

import { useState } from "react";

export default function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="DOA에게 말 걸어보세요..."
        className="flex-1 rounded-full border border-doa-pink-100 bg-white px-4 py-2 text-sm outline-none focus:border-doa-pink-300"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="rounded-full bg-doa-pink-300 px-5 py-2 text-sm font-[family-name:var(--font-cute-heading)] text-white transition hover:bg-doa-pink-500 disabled:opacity-40"
      >
        전송
      </button>
    </form>
  );
}
