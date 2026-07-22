"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("아이디 또는 비밀번호가 맞지 않아요...");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-white/70 p-8 shadow-lg shadow-doa-pink-100 backdrop-blur"
    >
      <h1 className="font-[family-name:var(--font-cute-heading)] text-3xl text-doa-pink-500">
        DOA
      </h1>
      <p className="text-center text-sm text-doa-ink/70">다시 만나서 반가워요!</p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        className="w-full rounded-full border border-doa-pink-100 bg-white px-4 py-2 text-center outline-none focus:border-doa-pink-300"
        placeholder="아이디"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-full border border-doa-pink-100 bg-white px-4 py-2 text-center outline-none focus:border-doa-pink-300"
        placeholder="비밀번호"
      />
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full rounded-full bg-doa-pink-300 py-2 font-[family-name:var(--font-cute-heading)] text-white transition hover:bg-doa-pink-500 disabled:opacity-50"
      >
        {loading ? "확인 중..." : "들어가기"}
      </button>
    </form>
  );
}
