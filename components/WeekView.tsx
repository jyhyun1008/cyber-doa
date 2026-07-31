"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { CalendarItem } from "@/types";
import { getWeekday, getDateKey, kstDateTimeToUTC } from "@/lib/time";
import { useMobileMenu } from "@/contexts/MobileMenuContext";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_META = {
  routine: { label: "루틴", line: "bg-doa-blue-300", text: "text-doa-ink" },
  schedule: { label: "일정", line: "bg-doa-pink-300", text: "text-doa-pink-500" },
  todo: { label: "데드라인", line: "bg-doa-purple-300", text: "text-doa-purple-300" },
} as const;

function dateKeyToNoonUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return kstDateTimeToUTC(y, m, d, 12, 0);
}

function shiftDateKey(key: string, deltaDays: number): string {
  const dt = dateKeyToNoonUtc(key);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return getDateKey(dt);
}

function getWeekStartKey(date: Date): string {
  const key = getDateKey(date);
  const weekday = getWeekday(date);
  return shiftDateKey(key, -weekday);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function WeekView() {
  const { openMenu } = useMobileMenu();
  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => getWeekStartKey(new Date()));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledToNow = useRef(false);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = shiftDateKey(weekStart, i);
        return { date, weekday: i, dayNum: Number(date.slice(8, 10)) };
      }),
    [weekStart]
  );

  const load = useCallback(async (start: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/week?start=${start}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  useEffect(() => {
    if (scrolledToNow.current || loading || !scrollRef.current) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    scrollRef.current.scrollTop = Math.max(0, (nowMinutes / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 3);
    scrolledToNow.current = true;
  }, [loading]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  function goToWeek(deltaWeeks: number) {
    setWeekStart((prev) => shiftDateKey(prev, deltaWeeks * 7));
  }

  function goToToday() {
    setWeekStart(getWeekStartKey(new Date()));
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
          위클리
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-doa-ink/60 shadow-sm hover:bg-white"
          >
            오늘
          </button>
          <button
            onClick={openMenu}
            aria-label="메뉴 열기"
            className="rounded-full bg-white/80 p-2 text-doa-pink-500 shadow-sm lg:hidden"
          >
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          onClick={() => goToWeek(-1)}
          aria-label="지난주"
          className="rounded-full px-3 py-1 text-doa-pink-500 hover:bg-white/60"
        >
          ◀
        </button>
        <span className="text-xs text-doa-ink/60">
          {weekDays[0].date} ~ {weekDays[6].date}
        </span>
        <button
          onClick={() => goToWeek(1)}
          aria-label="다음주"
          className="rounded-full px-3 py-1 text-doa-pink-500 hover:bg-white/60"
        >
          ▶
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 pb-1 text-[11px] text-doa-ink/60">
        {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${TYPE_META[type].line}`} />
            {TYPE_META[type].label}
          </span>
        ))}
      </div>

      {/* day header row */}
      <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-px px-2">
        <div />
        {weekDays.map((d) => (
          <div
            key={d.date}
            className={`flex flex-col items-center rounded-t-xl py-1 text-[11px] ${
              d.date === todayKey ? "bg-doa-pink-100 text-doa-pink-500" : "text-doa-ink/60"
            }`}
          >
            <span>{WEEKDAY_LABELS[d.weekday]}</span>
            <span className="font-[family-name:var(--font-cute-heading)] text-sm">{d.dayNum}</span>
          </div>
        ))}
      </div>

      {/* all-day / no-specific-time items row */}
      <div className="grid grid-cols-[28px_repeat(7,1fr)] gap-px border-b border-doa-pink-100/40 px-2 pb-1.5">
        <div />
        {weekDays.map((d) => {
          const allDay = (itemsByDate.get(d.date) ?? []).filter((it) => it.time === null);
          return (
            <div key={d.date} className="flex flex-col gap-0.5 px-0.5">
              {allDay.map((it, i) => (
                <span
                  key={i}
                  className={`truncate rounded px-1 text-[9px] leading-tight ${TYPE_META[it.type].text}`}
                  title={it.title}
                >
                  {it.title}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* time grid */}
      <div ref={scrollRef} className="scrollbar-cute flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <p className="pt-4 text-center text-xs text-doa-ink/50">불러오는 중...</p>
        ) : (
          <div className="relative grid grid-cols-[28px_repeat(7,1fr)] gap-px" style={{ height: 24 * HOUR_HEIGHT }}>
            <div className="relative">
              {HOURS.map((h) => (
                <span
                  key={h}
                  style={{ top: h * HOUR_HEIGHT - 6 }}
                  className="absolute right-1 text-[9px] text-doa-ink/40"
                >
                  {h}
                </span>
              ))}
            </div>
            {weekDays.map((d) => {
              const timed = (itemsByDate.get(d.date) ?? []).filter(
                (it): it is CalendarItem & { time: string } => it.time !== null
              );
              return (
                <div
                  key={d.date}
                  className={`relative border-l border-doa-pink-100/30 ${
                    d.date === todayKey ? "bg-doa-pink-50/40" : ""
                  }`}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{ top: h * HOUR_HEIGHT }}
                      className="absolute w-full border-t border-doa-pink-100/20"
                    />
                  ))}
                  {timed.map((item, i) => {
                    const top = (timeToMinutes(item.time) / 60) * HOUR_HEIGHT;
                    const meta = TYPE_META[item.type];
                    const isTodo = item.type === "todo";
                    return (
                      <div
                        key={i}
                        style={{ top, transform: isTodo ? "translateY(-100%)" : undefined }}
                        className="absolute w-full px-0.5"
                      >
                        {isTodo && (
                          <span className={`block truncate text-[9px] leading-tight ${meta.text}`} title={item.title}>
                            {item.title}
                          </span>
                        )}
                        <span className={`block h-[2px] w-full rounded-full ${meta.line}`} />
                        {!isTodo && (
                          <span className={`block truncate text-[9px] leading-tight ${meta.text}`} title={item.title}>
                            {item.title}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
