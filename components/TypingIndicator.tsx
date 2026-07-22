import Image from "next/image";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <Image
        src="/doa-icon.png"
        alt="DOA"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover shadow"
      />
      <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-doa-pink-300 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-doa-pink-300 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-doa-pink-300" />
      </div>
    </div>
  );
}
