"use client";

import Image from "next/image";
import { useMemoryPanel } from "@/hooks/useMemoryPanel";
import { useMobileMenu } from "@/contexts/MobileMenuContext";
import { getHHMM, NO_TIME_DEADLINE_SENTINEL_HHMM } from "@/lib/time";

function formatDeadline(iso: string) {
  const date = new Date(iso);
  const hasNoSpecificTime = getHHMM(date) === NO_TIME_DEADLINE_SENTINEL_HHMM;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    ...(hasNoSpecificTime ? {} : { hour: "2-digit", minute: "2-digit", hour12: false }),
  }).format(date);
}

const TILTS = ["-1.2deg", "0.9deg", "-0.5deg", "1.1deg"];
const TAPE_STYLES = [
  "left-6 bg-doa-blue-100",
  "right-7 bg-doa-purple-100",
  "left-9 bg-doa-pink-100",
  "right-5 bg-doa-blue-100",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Card({
  index,
  title,
  meta,
  done,
  accent = "default",
  onToggleComplete,
  onDelete,
}: {
  index: number;
  title: string;
  meta?: string;
  done: boolean;
  accent?: "default" | "todo";
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const tilt = TILTS[index % TILTS.length];
  const isTodo = accent === "todo";
  const tape = TAPE_STYLES[index % TAPE_STYLES.length];
  const shadowColor = isTodo ? "var(--color-doa-purple-100)" : "var(--color-doa-pink-100)";
  const metaColor = isTodo ? "text-doa-purple-300" : "text-doa-pink-500";
  return (
    <div
      style={{ transform: `rotate(${tilt})`, boxShadow: `0 4px 0 ${shadowColor}` }}
      className={`relative flex min-h-[120px] flex-col justify-between rounded-3xl border-2 p-4 transition-transform hover:-translate-y-0.5 hover:rotate-0 ${
        done ? "border-doa-pink-100/30 bg-doa-cream" : "border-doa-pink-100/50 bg-white"
      }`}
    >
      <span
        className={`absolute -top-2 h-4 w-11 -rotate-6 rounded-sm border border-doa-pink-100/50 opacity-90 ${tape} ${
          done ? "opacity-40" : ""
        }`}
      />
      <p
        className={`mt-1 text-sm leading-relaxed break-words ${
          done ? "text-doa-ink/40 line-through" : "text-doa-ink"
        }`}
      >
        {title}
      </p>
      <div className="mt-2 flex items-end justify-between gap-1">
        {meta ? (
          <span className={`text-[11px] ${done ? "text-doa-ink/30" : metaColor}`}>· {meta}</span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onToggleComplete}
            aria-label={done ? "완료 취소" : "완료"}
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110 ${
              done
                ? isTodo
                  ? "bg-doa-purple-300 text-white"
                  : "bg-doa-pink-300 text-white"
                : "bg-doa-blue-100 text-doa-ink/60 hover:text-doa-ink"
            }`}
          >
            <CheckIcon />
          </button>
          <button
            onClick={onDelete}
            aria-label="삭제"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-doa-pink-100 text-doa-ink/60 shadow-sm transition-transform hover:scale-110 hover:text-rose-500"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListView() {
  const { openMenu } = useMobileMenu();
  const { memory, refresh } = useMemoryPanel();

  async function toggleTodoCompleted(id: string, isDone: boolean) {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDone: !isDone }),
    });
    refresh();
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    refresh();
  }

  async function toggleBucketItemCompleted(id: string, isDone: boolean) {
    await fetch(`/api/bucket/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDone: !isDone }),
    });
    refresh();
  }

  async function deleteBucketItem(id: string) {
    await fetch(`/api/bucket/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col lg:h-full lg:rounded-3xl lg:bg-white/60 lg:shadow-lg lg:shadow-doa-pink-100 lg:backdrop-blur">
      <header className="flex items-center justify-between gap-2 border-b border-doa-pink-100/60 bg-white/60 px-4 py-3 backdrop-blur lg:rounded-t-3xl lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-2 lg:hidden">
          <Image
            src="/doa-icon.png"
            alt="DOA"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border-2 border-white object-cover shadow"
          />
          <span className="font-[family-name:var(--font-cute-heading)] text-xl text-doa-pink-500">
            DOA
          </span>
        </div>
        <span className="hidden font-[family-name:var(--font-cute-heading)] text-lg text-doa-pink-500 lg:inline">
          데드라인 · 버킷리스트
        </span>
        <button
          onClick={openMenu}
          aria-label="메뉴 열기"
          className="rounded-full bg-white/80 p-2 text-doa-pink-500 shadow-sm lg:hidden"
        >
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </button>
      </header>

      <div className="scrollbar-cute flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-cute-heading)] text-sm text-doa-pink-500">
            데드라인
          </h2>
          {memory && memory.todos.length === 0 && (
            <p className="text-xs text-doa-ink/50">등록된 데드라인이 없어요.</p>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            {memory?.todos.map((todo, i) => (
              <Card
                key={todo.id}
                index={i}
                title={todo.title}
                meta={todo.deadline ? formatDeadline(todo.deadline) : undefined}
                done={todo.isDone}
                accent="todo"
                onToggleComplete={() => toggleTodoCompleted(todo.id, todo.isDone)}
                onDelete={() => deleteTodo(todo.id)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-cute-heading)] text-sm text-doa-pink-500">
            버킷리스트
          </h2>
          {memory && memory.bucketItems.length === 0 && (
            <p className="text-xs text-doa-ink/50">등록된 버킷리스트가 없어요.</p>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            {memory?.bucketItems.map((item, i) => (
              <Card
                key={item.id}
                index={i}
                title={item.title}
                done={item.isDone}
                onToggleComplete={() => toggleBucketItemCompleted(item.id, item.isDone)}
                onDelete={() => deleteBucketItem(item.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
