export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source: string;
  createdAt: string;
};

export type MemorySnapshot = {
  profile: string;
  todos: { id: string; title: string; deadline: string | null }[];
  routines: { id: string; title: string; daysOfWeek: number[]; time: string }[];
  schedules: { id: string; title: string; scheduledAt: string }[];
};
