"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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

// Quick nav links shown in full-screen mode header
const NAV_LINKS = [
  { href: "/",              label: "Overview"       },
  { href: "/loads",         label: "Loads"          },
  { href: "/stock",         label: "Stock"          },
  { href: "/transfers",     label: "Transfers"      },
  { href: "/discrepancies", label: "Discrepancies"  },
  { href: "/reports",       label: "Reports"        },
];

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

  const isFull = mode === "full";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

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
        body: JSON.stringify({ messages: history, page: pathname }),
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
    <div className={`flex flex-col bg-white shrink-0 ${isFull ? "flex-1" : "w-[400px] border-l border-slate-200"}`}>

      {/* ── header ── */}
      <div className="bg-slate-900 shrink-0">
        {/* top bar */}
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">Roci AI</span>
              <span className="text-slate-500 text-xs ml-2">claude-sonnet-4-6</span>
            </div>
          </div>

          {/* mode controls */}
          <div className="flex items-center gap-2">
            {isFull ? (
              /* Minimise button — large, labelled */
              <button
                onClick={() => onModeChange("minimised")}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
                Minimise
              </button>
            ) : (
              /* Expand button — large, labelled */
              <button
                onClick={() => onModeChange("full")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Expand
              </button>
            )}
            <button
              onClick={() => onModeChange("hidden")}
              title="Hide AI"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Hide
            </button>
          </div>
        </div>

        {/* nav strip — only in full mode */}
        {isFull && (
          <div className="flex items-center gap-1 px-5 pb-3 overflow-x-auto">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => onModeChange("minimised")}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  pathname === href
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className={`py-6 mx-auto w-full ${isFull ? "max-w-3xl px-8" : "px-4"}`}>

          {messages.length === 0 ? (
            /* empty / welcome state */
            <div className={`flex flex-col ${isFull ? "items-center text-center min-h-[420px] justify-center" : "items-start"}`}>
              {isFull && (
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5 shadow-lg">
                    <span className="text-white font-bold text-2xl">R</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">How can I help?</h2>
                  <p className="text-slate-500">Ask me anything about your operations, or ask me to take action.</p>
                </div>
              )}
              {!isFull && (
                <p className="text-slate-400 text-sm mb-4">Ask me anything about your operations.</p>
              )}
              <div className={`grid gap-2 w-full ${isFull ? "grid-cols-2 max-w-xl" : "grid-cols-1"}`}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl transition-colors"
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
                  <div className={`rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? `bg-blue-600 text-white rounded-br-sm ${isFull ? "max-w-xl" : "max-w-[88%]"}`
                      : `bg-slate-100 text-slate-800 rounded-bl-sm ${isFull ? "max-w-2xl" : "max-w-[88%]"}`
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_td]:py-1 [&_th]:py-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex items-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── input ── */}
      <div className="shrink-0 border-t border-slate-100 p-4">
        <div className={`flex items-end gap-3 mx-auto ${isFull ? "max-w-3xl" : ""}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-36 overflow-auto"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shrink-0"
          >
            Send
          </button>
        </div>
        {isFull && (
          <p className="text-center text-xs text-slate-300 mt-2">Shift+Enter for new line</p>
        )}
      </div>
    </div>
  );
}
