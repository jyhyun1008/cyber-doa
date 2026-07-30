"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarItem } from "@/types";
import { getWeekday, kstDateTimeToUTC, getDateKey } from "@/lib/time";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const TYPE_META = {
  routine: { label: "루틴", dot: "bg-doa-blue-300", chip: "bg-doa-blue-100 text-doa-ink" },
  schedule: { label: "일정", dot: "bg-doa-pink-300", chip: "bg-doa-pink-100 text-doa-ink" },
  todo: { label: "할 일 마감", dot: "bg-doa-purple-300", chip: "bg-doa-purple-100 text-doa-ink" },
} as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CalendarView() {
  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);
  const [viewYear, setViewYear] = useState(Number(todayKey.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(todayKey.slice(5, 7)));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(viewYear, viewMonth);
  }, [viewYear, viewMonth, load]);

  function goToMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  function goToToday() {
    setViewYear(Number(todayKey.slice(0, 4)));
    setViewMonth(Number(todayKey.slice(5, 7)));
    setSelectedDate(todayKey);
  }

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const firstWeekday = getWeekday(kstDateTimeToUTC(viewYear, viewMonth, 1, 12, 0));

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedItems = itemsByDate.get(selectedDate) ?? [];

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col p-4">
      <header className="mb-3 flex items-center justify-between">
        <Link
          href="/"
          className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
        >
          ← 채팅으로
        </Link>
        <h1 className="font-[family-name:var(--font-cute-heading)] text-lg text-doa-pink-500">
          캘린더
        </h1>
        <button
          onClick={goToToday}
          className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
        >
          오늘
        </button>
      </header>

      <div className="flex flex-col gap-3 rounded-3xl bg-white/60 p-4 shadow-lg shadow-doa-pink-100 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToMonth(-1)}
            aria-label="이전 달"
            className="rounded-full px-3 py-1 text-doa-pink-500 hover:bg-white/60"
          >
            ◀
          </button>
          <span className="font-[family-name:var(--font-cute-heading)] text-base text-doa-ink">
            {viewYear}년 {viewMonth}월
          </span>
          <button
            onClick={() => goToMonth(1)}
            aria-label="다음 달"
            className="rounded-full px-3 py-1 text-doa-pink-500 hover:bg-white/60"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-doa-ink/60">
          {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((type) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${TYPE_META[type].dot}`} />
              {TYPE_META[type].label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-doa-ink/50">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateKey = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
            const dayItems = itemsByDate.get(dateKey) ?? [];
            const types = [...new Set(dayItems.map((it) => it.type))];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl pt-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-doa-pink-300 text-white"
                    : isToday
                      ? "bg-doa-pink-100 text-doa-ink"
                      : "text-doa-ink/80 hover:bg-white/70"
                }`}
              >
                <span>{day}</span>
                <span className="flex gap-0.5">
                  {types.map((type) => (
                    <span
                      key={type}
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-white" : TYPE_META[type].dot
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-cute mt-3 flex-1 overflow-y-auto rounded-3xl bg-white/60 p-4 shadow-lg shadow-doa-pink-100 backdrop-blur">
        <h2 className="mb-2 font-[family-name:var(--font-cute-heading)] text-sm text-doa-pink-500">
          {selectedDate}
        </h2>
        {loading ? (
          <p className="text-xs text-doa-ink/50">불러오는 중...</p>
        ) : selectedItems.length === 0 ? (
          <p className="text-xs text-doa-ink/50">이 날에는 아무것도 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {selectedItems.map((item, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs ${TYPE_META[item.type].chip}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_META[item.type].dot}`} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {item.time && <span className="shrink-0 text-doa-ink/60">{item.time}</span>}
                <span className="shrink-0 text-[10px] text-doa-ink/40">{TYPE_META[item.type].label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
