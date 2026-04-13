"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { PanelMode } from "./LayoutShell";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

type ApiMessage = { role: "user" | "assistant"; content: string };

const ACTION_LABEL: Record<string, string> = {
  get_summary:         "Checked summary",
  get_loads:           "Checked loads",
  get_inventory:       "Checked inventory",
  get_transfers:       "Checked transfers",
  get_discrepancies:   "Checked discrepancies",
  get_recent_activity: "Checked activity log",
  create_load:         "Created load",
  update_load:         "Updated load",
};

const SUGGESTIONS = [
  "What needs attention right now?",
  "Give me a full operations summary",
  "Any loads at risk today?",
  "Which PODs are outstanding?",
  "Show me failed deliveries",
  "What subcontractors need reconciling?",
];

const PAGE_LABEL: Record<string, string> = {
  "/":              "Operations Overview",
  "/loads":         "Load Management",
  "/stock":         "Stock",
  "/pallets":       "Pallets",
  "/goods-in":      "Inbound",
  "/transfers":     "Transfers",
  "/discrepancies": "Discrepancies",
  "/reports":       "Reports",
  "/admin":         "System Admin",
};

interface Props {
  mode: PanelMode;
  onModeChange: (m: PanelMode) => void;
}

export default function ChatPanel({ mode, onModeChange }: Props) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (mode !== "hidden") textareaRef.current?.focus();
  }, [mode]);

  if (mode === "hidden") return null;

  const isWide = mode === "wide";
  const currentPage = PAGE_LABEL[pathname] ?? pathname;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    setInput("");

    const newMsg: Message = { role: "user", content };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setThinking(true);

    const history: ApiMessage[] = updated.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, page: currentPage }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, actions: data.actions ?? [] },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Something went wrong."}`, actions: [] },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div
      className={`flex flex-col bg-white border-l border-slate-200 shrink-0 transition-all duration-300 ${
        isWide ? "flex-1" : "w-[400px]"
      }`}
    >
      {/* ── header ── */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-white font-semibold text-sm">Roci AI</span>
          {pathname && (
            <span className="text-slate-500 text-xs hidden sm:inline">· {currentPage}</span>
          )}
        </div>

        {/* mode toggles */}
        <div className="flex items-center gap-1">
          <ModeBtn
            active={isWide}
            onClick={() => onModeChange("wide")}
            title="Full screen"
          >
            {/* expand icon */}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </ModeBtn>
          <ModeBtn
            active={!isWide}
            onClick={() => onModeChange("sidebar")}
            title="Sidebar"
          >
            {/* sidebar icon */}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </ModeBtn>
          <button
            onClick={() => onModeChange("hidden")}
            title="Hide"
            className="text-slate-500 hover:text-white p-1 rounded transition-colors ml-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className={`py-6 mx-auto w-full ${isWide ? "max-w-3xl px-8" : "px-4"}`}>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[380px] text-center">
              {isWide && (
                <div className="mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-lg">R</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Roci AI</h2>
                  <p className="text-slate-500 text-sm">Your logistics operations assistant</p>
                </div>
              )}
              <p className={`text-slate-400 text-sm mb-5 ${!isWide ? "text-left w-full" : ""}`}>
                Ask me anything about your operations, or ask me to take action.
              </p>
              <div className={`grid gap-2 w-full ${isWide ? "grid-cols-2 max-w-lg" : "grid-cols-1"}`}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[...new Set(m.actions)].map((a) => (
                        <span key={a} className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                          {ACTION_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? `bg-blue-600 text-white rounded-br-sm ${isWide ? "max-w-xl" : "max-w-[85%]"}`
                        : `bg-slate-100 text-slate-800 rounded-bl-sm ${isWide ? "max-w-2xl" : "max-w-[85%]"}`
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_td]:py-1 [&_th]:py-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex items-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── input ── */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className={`flex items-end gap-2 mx-auto ${isWide ? "max-w-3xl" : ""}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-auto"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ children, active, onClick, title }: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "text-white bg-slate-700" : "text-slate-500 hover:text-white hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
