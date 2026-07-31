"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemoryPanel } from "@/hooks/useMemoryPanel";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useOpenAIKey } from "@/hooks/useOpenAIKey";
import { getWeekday, getHHMM, NO_TIME_SENTINEL_HHMM } from "@/lib/time";
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
  const date = new Date(iso);
  const hasNoSpecificTime = getHHMM(date) === NO_TIME_SENTINEL_HHMM;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    ...(hasNoSpecificTime ? {} : { hour: "2-digit", minute: "2-digit", hour12: false }),
  }).format(date);
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      {locked ? (
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      ) : (
        <path d="M8 11V7a4 4 0 0 1 7.5-2" />
      )}
    </svg>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-full px-1.5 text-doa-ink/40 hover:text-rose-500"
    >
      ✕
    </button>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-1">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between text-xs font-bold text-doa-pink-500"
      >
        <span>{title}</span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
      </button>
      {isOpen && children}
    </section>
  );
}

// caps each open section to ~2-3 items before it scrolls internally, so the whole
// sidebar doesn't turn into one long scroll
const LIST_SCROLL_CLASSES = "scrollbar-cute flex max-h-28 flex-col gap-1 overflow-y-auto";

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCalendarPage = pathname === "/calendar";
  const { memory, refresh } = useMemoryPanel();
  const todayWeekday = getWeekday();
  const sortedRoutines = useMemo(() => {
    if (!memory) return [];
    return [...memory.routines].sort((a, b) => {
      const aToday = a.daysOfWeek.includes(todayWeekday);
      const bToday = b.daysOfWeek.includes(todayWeekday);
      if (aToday !== bToday) return aToday ? -1 : 1;
      return a.time.localeCompare(b.time);
    });
  }, [memory, todayWeekday]);
  const { permission, subscribed, subscribe, error: pushError } = usePushSubscription();
  const { settings, toggleSignup } = useAppSettings();
  const { apiKey, setApiKey, clearApiKey } = useOpenAIKey();
  const [apiKeyInput, setApiKeyInput] = useState("");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    refresh();
  }

  async function deleteSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    refresh();
  }

  async function toggleRoutineCompleted(id: string, completedToday: boolean) {
    await fetch(`/api/routines/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completedToday: !completedToday }),
    });
    refresh();
  }

  async function deleteRoutine(id: string) {
    await fetch(`/api/routines/${id}`, { method: "DELETE" });
    refresh();
  }

  async function deleteBucketItem(id: string) {
    await fetch(`/api/bucket/${id}`, { method: "DELETE" });
    refresh();
  }

  function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    setApiKey(apiKeyInput);
    setApiKeyInput("");
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`scrollbar-cute fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col gap-4 overflow-y-auto bg-doa-cream p-5 shadow-lg shadow-doa-pink-100 backdrop-blur transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:rounded-3xl lg:bg-white/60 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="self-end rounded-full px-2 text-doa-ink/50 lg:hidden"
        >
          ✕
        </button>
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
          <p className="text-xs text-doa-ink/60">
            {memory?.username ? `${memory.username}님으로 로그인 중` : "귀여운 메이드 챗봇"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={isCalendarPage ? "/" : "/calendar"}
            className="rounded-full bg-white/80 px-3 py-2 text-center text-xs text-doa-pink-500 shadow-sm hover:bg-white"
          >
            {isCalendarPage ? "💬 채팅 보기" : "📅 캘린더 보기"}
          </Link>
          {permission !== "unsupported" && !subscribed && (
            <button
              onClick={subscribe}
              className="rounded-full bg-white/80 px-3 py-2 text-xs text-doa-pink-500 shadow-sm hover:bg-white"
            >
              🔔 알림 켜기
            </button>
          )}
          <InstallPrompt />
          {settings?.isOwner && (
            <button
              onClick={() => toggleSignup(!settings.signupEnabled)}
              className="flex items-center justify-center gap-1.5 rounded-full bg-white/80 px-3 py-2 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
            >
              <LockIcon locked={!settings.signupEnabled} />
              {settings.signupEnabled ? "새 가입 허용 중" : "새 가입 막음"}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full bg-white/80 px-3 py-2 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
          >
            로그아웃
          </button>
          {pushError && <p className="text-center text-[11px] text-rose-500">{pushError}</p>}
        </div>

        <CollapsibleSection title="DOA가 기억하는 나" defaultOpen={false}>
          <p className="scrollbar-cute max-h-28 overflow-y-auto rounded-2xl bg-white/70 p-3 text-xs leading-relaxed whitespace-pre-wrap text-doa-ink/80">
            {memory?.profile ? memory.profile : "아직 알고 있는 정보가 없어요."}
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="할 일" defaultOpen={true}>
          {memory && memory.todos.length === 0 && (
            <p className="text-xs text-doa-ink/50">등록된 할 일이 없어요.</p>
          )}
          <ul className={LIST_SCROLL_CLASSES}>
            {memory?.todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between gap-1 rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80"
              >
                <span>
                  {todo.title}
                  {todo.deadline && (
                    <span className="ml-1 text-doa-pink-500">· {formatDateTime(todo.deadline)}</span>
                  )}
                </span>
                <DeleteButton onClick={() => deleteTodo(todo.id)} label="할 일 삭제" />
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="버킷리스트" defaultOpen={false}>
          {memory && memory.bucketItems.length === 0 && (
            <p className="text-xs text-doa-ink/50">등록된 버킷리스트가 없어요.</p>
          )}
          <ul className={LIST_SCROLL_CLASSES}>
            {memory?.bucketItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-1 rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80"
              >
                <span>{item.title}</span>
                <DeleteButton onClick={() => deleteBucketItem(item.id)} label="버킷리스트 삭제" />
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="반복 루틴" defaultOpen={false}>
          {memory && memory.routines.length === 0 && (
            <p className="text-xs text-doa-ink/50">등록된 루틴이 없어요.</p>
          )}
          <ul className={LIST_SCROLL_CLASSES}>
            {sortedRoutines.map((routine) => (
              <li
                key={routine.id}
                className={`flex items-center justify-between gap-1 rounded-xl px-3 py-1.5 text-xs ${
                  routine.daysOfWeek.includes(todayWeekday) ? "bg-doa-pink-100/70" : "bg-white/70"
                } ${routine.completedToday ? "text-doa-ink/40" : "text-doa-ink/80"}`}
              >
                <span className={`min-w-0 truncate ${routine.completedToday ? "line-through" : ""}`}>
                  {routine.title}
                  <span className="ml-1 text-doa-blue-300">
                    · {formatDaysOfWeek(routine.daysOfWeek)} {routine.time}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleRoutineCompleted(routine.id, routine.completedToday)}
                    aria-label={routine.completedToday ? "오늘 실행 취소" : "오늘 실행 완료"}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      routine.completedToday
                        ? "border-doa-pink-300 bg-doa-pink-300 text-white"
                        : "border-doa-ink/30 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <DeleteButton onClick={() => deleteRoutine(routine.id)} label="루틴 삭제" />
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="다가오는 일정" defaultOpen={false}>
          {memory && memory.schedules.length === 0 && (
            <p className="text-xs text-doa-ink/50">예정된 일정이 없어요.</p>
          )}
          <ul className={LIST_SCROLL_CLASSES}>
            {memory?.schedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center justify-between gap-1 rounded-xl bg-white/70 px-3 py-1.5 text-xs text-doa-ink/80"
              >
                <span>
                  {schedule.title}
                  <span className="ml-1 text-doa-pink-500">· {formatDateTime(schedule.scheduledAt)}</span>
                </span>
                <DeleteButton onClick={() => deleteSchedule(schedule.id)} label="일정 삭제" />
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="내 OpenAI API 키" defaultOpen={false}>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-white/70 p-3">
            <p className="text-[11px] leading-relaxed text-doa-ink/60">
              내 키를 넣으면 채팅은 내 키로 동작해요(이 브라우저에만 저장, 서버에 저장 안 됨). 선톡은 항상 기본 키로
              보내져요.
            </p>
            <p className="text-[11px] font-bold text-doa-ink/70">
              {apiKey ? "현재: 내 API 키 사용 중" : "현재: 기본(공유) 키 사용 중"}
            </p>
            <form onSubmit={handleSaveApiKey} className="flex gap-1">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="min-w-0 flex-1 rounded-full border border-doa-pink-100 bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-doa-pink-300"
              />
              <button
                type="submit"
                disabled={!apiKeyInput.trim()}
                className="shrink-0 rounded-full bg-doa-pink-300 px-3 py-1.5 text-[11px] text-white disabled:opacity-40"
              >
                저장
              </button>
            </form>
            {apiKey && (
              <button
                onClick={clearApiKey}
                className="self-start text-[11px] text-doa-ink/50 underline hover:text-rose-500"
              >
                내 키 지우고 기본 키로 돌아가기
              </button>
            )}
          </div>
        </CollapsibleSection>
      </aside>
    </>
  );
}
