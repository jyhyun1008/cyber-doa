export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source: string;
  createdAt: string;
};

export type MemorySnapshot = {
  username: string;
  profile: string;
  todos: { id: string; title: string; deadline: string | null }[];
  bucketItems: { id: string; title: string }[];
  routines: { id: string; title: string; daysOfWeek: number[]; time: string; isActive: boolean }[];
  schedules: { id: string; title: string; scheduledAt: string }[];
};

export type AppSettings = {
  signupEnabled: boolean;
  isOwner: boolean;
};

export type CalendarItem = {
  date: string;
  type: "routine" | "schedule" | "todo";
  title: string;
  time: string | null;
};
