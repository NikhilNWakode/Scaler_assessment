"use client";

import { SendHorizonal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/useMeetingRoom";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export default function ChatPanel({ messages, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <aside className="flex w-full flex-col border-l border-zoom-border bg-zoom-panel sm:w-80">
      <div className="flex items-center justify-between border-b border-zoom-border px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-100">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-white/10"
          aria-label="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-gray-500">
            Messages can only be seen by people in the meeting.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <p className="text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300">
                {m.self ? "You" : m.name}
              </span>{" "}
              · {m.time}
            </p>
            <p
              className={`mt-0.5 inline-block max-w-full break-words rounded-lg px-3 py-1.5 text-sm ${
                m.self ? "bg-zoom-blue text-white" : "bg-zoom-tile text-gray-100"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-zoom-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message here…"
          className="flex-1 rounded-lg border border-zoom-border bg-zoom-tile px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-zoom-blue"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-zoom-blue px-3 text-white hover:bg-zoom-blue-dark disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizonal size={16} />
        </button>
      </form>
    </aside>
  );
}
