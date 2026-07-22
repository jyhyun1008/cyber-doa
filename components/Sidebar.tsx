"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemoryPanel } from "@/hooks/useMemoryPanel";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import InstallPrompt from "./InstallPrompt";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDaysOfWeek(days: number[]) {
  if (days.length === 7) return "매일";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function Sidebar() {
  const router = useRouter();
  const memory = useMemoryPanel();
  const { permission, subscribed, subscribe } = usePushSubscription();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto rounded-3xl bg-white/60 p-5 shadow-lg shadow-doa-pink-100 backdrop-blur lg:flex">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/doa-icon.png"
          alt="DOA"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full border-4 border-white object-cover shadow"
        />
        <h1 className="font-[family-name:var(--font-cute-heading)] text-2xl text-doa-pink-500">
          DOA
        </h1>
        <p className="text-xs text-doa-ink/60">귀여운 메이드 챗봇</p>
      </div>

      <div className="flex flex-col gap-2">
        {permission !== "unsupported" && !subscribed && (
          <button
            onClick={subscribe}
            className="rounded-full bg-white/80 px-3 py-2 text-xs text-doa-pink-500 shadow-sm hover:bg-white"
          >
            🔔 알림 켜기
          </button>
        )}
        <InstallPrompt />
        <button
          onClick={handleLogout}
          className="rounded-full bg-white/80 px-3 py-2 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
        >
          로그아웃
        </button>
      </div>

      <section className="flex flex-col gap-1">
        <button
          onClick={() => setIsProfileOpen((prev) => !prev)}
          className="flex items-center justify-between text-xs font-bold text-doa-pink-500"
        >
          <span>DOA가 기억하는 나</span>
          <span className={`transition-transform ${isProfileOpen ? "rotate-180" : ""}`}>▾</span>
        </button>
        {isProfileOpen && (
          <p className="line-clamp-4 rounded-2xl bg-white/70 p-3 text-xs leading-relaxed text-doa-ink/80">
            {memory?.profile ? memory.profile : "아직 알고 있는 정보가 없어요."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-bold text-doa-pink-500">할 일</h2>
        {memory && memory.todos.length === 0 && (
          <p className="text-xs text-doa-ink/50">등록된 할 일이 없어요.</p>
        )}
        <ul className="flex flex-col gap-1">
          {memory?.todos.map((todo) => (
            <li key={todo.id} className="rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80">
              {todo.title}
              {todo.deadline && (
                <span className="ml-1 text-doa-pink-500">· {formatDateTime(todo.deadline)}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-bold text-doa-pink-500">반복 루틴</h2>
        {memory && memory.routines.length === 0 && (
          <p className="text-xs text-doa-ink/50">등록된 루틴이 없어요.</p>
        )}
        <ul className="flex flex-col gap-1">
          {memory?.routines.map((routine) => (
            <li key={routine.id} className="rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80">
              {routine.title}
              <span className="ml-1 text-doa-blue-300">
                · {formatDaysOfWeek(routine.daysOfWeek)} {routine.time}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-bold text-doa-pink-500">다가오는 일정</h2>
        {memory && memory.schedules.length === 0 && (
          <p className="text-xs text-doa-ink/50">예정된 일정이 없어요.</p>
        )}
        <ul className="flex flex-col gap-1">
          {memory?.schedules.map((schedule) => (
            <li key={schedule.id} className="rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80">
              {schedule.title}
              <span className="ml-1 text-doa-pink-500">· {formatDateTime(schedule.scheduledAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
