"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

type ApiMessage = { role: "user" | "assistant"; content: string };

const ACTION_LABEL: Record<string, string> = {
  get_summary:        "Checked summary",
  get_loads:          "Checked loads",
  get_inventory:      "Checked inventory",
  get_transfers:      "Checked transfers",
  get_discrepancies:  "Checked discrepancies",
  get_recent_activity:"Checked activity log",
  create_load:        "Created load",
  update_load:        "Updated load",
};

const SUGGESTIONS = [
  "What needs attention today?",
  "How many active loads do we have?",
  "Any PODs outstanding?",
  "Show failed deliveries",
  "What's our current stock level?",
];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    setInput("");

    const newMsg: Message = { role: "user", content };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setThinking(true);

    // Build history for API (only role+content, no actions metadata)
    const history: ApiMessage[] = updated.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, actions: data.actions ?? [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", actions: [] },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          open
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        title="Roci AI"
      >
        {open ? (
          <span className="text-white text-lg">✕</span>
        ) : (
          <span className="text-white font-bold text-sm">AI</span>
        )}
      </button>

      {/* panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white font-semibold text-sm">Roci AI</span>
            </div>
            <span className="text-slate-500 text-xs">claude-sonnet-4-6</span>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center">
                <p className="text-slate-400 text-sm text-center mb-5">
                  Ask me anything about your operations, or ask me to take action.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  {/* tool activity badges */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {[...new Set(m.actions)].map((a) => (
                        <span key={a} className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                          {ACTION_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&_li]:text-slate-700">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))
            )}

            {/* thinking indicator */}
            {thinking && (
              <div className="flex items-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div className="shrink-0 border-t border-slate-100 px-3 py-3 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything… (Enter to send)"
              rows={1}
              className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28 overflow-auto"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0 h-9"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
