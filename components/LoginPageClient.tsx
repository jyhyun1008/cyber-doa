"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function LoginPageClient({ signupEnabled }: { signupEnabled: boolean }) {
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      {signupEnabled && (
        <div className="flex gap-1 rounded-full bg-white/60 p-1 text-xs shadow-sm">
          <button
            onClick={() => setTab("login")}
            className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-cute-heading)] transition ${
              tab === "login" ? "bg-doa-pink-300 text-white" : "text-doa-ink/60"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-cute-heading)] transition ${
              tab === "signup" ? "bg-doa-pink-300 text-white" : "text-doa-ink/60"
            }`}
          >
            회원가입
          </button>
        </div>
      )}
      {tab === "login" || !signupEnabled ? <LoginForm /> : <SignupForm />}
    </div>
  );
}
