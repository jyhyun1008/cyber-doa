"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("비밀번호는 4자 이상이어야 해요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "가입에 실패했어요...");
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
      <p className="text-center text-sm text-doa-ink/70">
        처음이시네요! 계정을 만들어주세요.
      </p>
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
        placeholder="비밀번호 (4자 이상)"
      />
      <input
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        className="w-full rounded-full border border-doa-pink-100 bg-white px-4 py-2 text-center outline-none focus:border-doa-pink-300"
        placeholder="비밀번호 확인"
      />
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username || !password || !passwordConfirm}
        className="w-full rounded-full bg-doa-pink-300 py-2 font-[family-name:var(--font-cute-heading)] text-white transition hover:bg-doa-pink-500 disabled:opacity-50"
      >
        {loading ? "만드는 중..." : "계정 만들기"}
      </button>
    </form>
  );
}
