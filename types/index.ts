export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source: string;
  createdAt: string;
};
