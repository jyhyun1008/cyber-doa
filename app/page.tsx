import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";

export default function HomePage() {
  return (
    <main className="mx-auto flex h-dvh max-w-6xl lg:gap-4 lg:p-4">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <ChatWindow />
      </div>
    </main>
  );
}
