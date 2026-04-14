"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { PanelMode } from "./LayoutShell";

// ── types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}
type ApiMessage = { role: "user" | "assistant"; content: string };

interface NavItem {
  label: string;
  href: string;
  description: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── nav structure ─────────────────────────────────────────────────────────────
const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Operations Dashboard", href: "/",      description: "KPIs, activity feed, AI insights" },
    ],
  },
  {
    label: "Loads",
    items: [
      { label: "All Loads",            href: "/loads", description: "Full booking register"            },
      { label: "Active",               href: "/loads", description: "Booked, collected, in transit"    },
      { label: "Failed Deliveries",    href: "/loads", description: "Failed — awaiting rebooking"      },
      { label: "POD Chasing",          href: "/loads", description: "Delivered, no POD received"       },
      { label: "Sub Reconciliation",   href: "/loads", description: "Subcontractor jobs to reconcile"  },
    ],
  },
  {
    label: "Stock",
    items: [
      { label: "Inventory",   href: "/stock",    description: "SKU quantities across all locations" },
      { label: "Pallets",     href: "/pallets",  description: "Pallet register and locations"       },
      { label: "Goods In",    href: "/goods-in", description: "Inbound receipts and documents"      },
    ],
  },
  {
    label: "Movements",
    items: [
      { label: "Transfers",      href: "/transfers",     description: "Inter-depot stock movements"    },
      { label: "Discrepancies",  href: "/discrepancies", description: "Stock variances and resolutions" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Operations Report", href: "/reports", description: "Summary across all modules"  },
      { label: "System Admin",      href: "/admin",   description: "Database viewer and controls" },
    ],
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
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
  { text: "What needs attention right now?",        icon: "⚡" },
  { text: "Give me a full operations summary",       icon: "📊" },
  { text: "Any loads at risk today?",                icon: "🚛" },
  { text: "Which PODs are outstanding?",             icon: "📋" },
  { text: "Show me failed deliveries",               icon: "⚠️" },
  { text: "What subcontractors need reconciling?",   icon: "✓"  },
];

// ── props ─────────────────────────────────────────────────────────────────────
interface Props {
  mode: PanelMode;
  onModeChange: (m: PanelMode) => void;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function ChatPanel({ mode, onModeChange }: Props) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [openNav, setOpenNav] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFull = mode === "full";

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenNav(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (mode !== "hidden") textareaRef.current?.focus();
  }, [mode]);

  // ── send ──────────────────────────────────────────────────────────────────
  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    setInput("");

    const updated = [...messages, { role: "user" as const, content }];
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

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
      isFull ? "flex-1 bg-white" : "w-[400px] bg-white border-l border-slate-200"
    }`}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-5 py-4">
          {/* branding */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" }}
            >
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold tracking-tight">Roci AI</span>
              <span className="text-slate-500 text-xs hidden sm:inline border border-slate-700 rounded px-1.5 py-0.5">
                claude-sonnet-4-6
              </span>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center gap-2">
            {isFull ? (
              <button
                onClick={() => onModeChange("minimised")}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
                Minimise
              </button>
            ) : (
              <button
                onClick={() => onModeChange("full")}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all duration-150 shadow-md shadow-blue-900/40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Expand
              </button>
            )}
            <button
              onClick={() => onModeChange("hidden")}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Hide
            </button>
          </div>
        </div>

        {/* ── dropdown nav (full mode only) ── */}
        {isFull && (
          <div ref={navRef} className="flex items-center gap-0.5 px-4 pb-1">
            {NAV.map((group) => {
              const isOpen = openNav === group.label;
              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setOpenNav(isOpen ? null : group.label)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all duration-150 ${
                      isOpen
                        ? "text-white bg-slate-700/60"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/40"
                    }`}
                  >
                    {group.label}
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {/* dropdown panel */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-64 animate-slide-down z-50
                      rounded-xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden"
                      style={{ background: "rgba(15,23,42,0.97)", backdropFilter: "blur(12px)" }}
                    >
                      <div className="p-1.5">
                        {group.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => { setOpenNav(null); onModeChange("minimised"); }}
                            className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-slate-700/60 transition-colors duration-100 group"
                          >
                            <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="text-xs text-slate-500 mt-0.5">{item.description}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* thin accent line */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)" }} />
      </div>

      {/* ══ MESSAGES ════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 overflow-y-auto"
        style={isFull ? { background: "radial-gradient(ellipse at 50% 0%, #eef2ff 0%, #ffffff 60%)" } : {}}
      >
        <div className={`py-8 mx-auto w-full ${isFull ? "max-w-3xl px-8" : "px-4"}`}>

          {messages.length === 0 ? (
            /* welcome screen */
            <div className={`flex flex-col ${isFull ? "items-center text-center min-h-[460px] justify-center" : "items-start"}`}>
              {isFull && (
                <div className="mb-10 animate-fade-in-up">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20"
                    style={{ background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" }}
                  >
                    <span className="text-white font-bold text-3xl">R</span>
                  </div>
                  <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">How can I help?</h2>
                  <p className="text-slate-500 text-lg">Ask me anything about your operations, or ask me to take action.</p>
                </div>
              )}
              {!isFull && (
                <p className="text-slate-400 text-sm mb-5">Ask me anything about your operations.</p>
              )}

              <div className={`grid gap-2.5 w-full ${isFull ? "grid-cols-2 max-w-2xl" : "grid-cols-1"}`}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s.text}
                    onClick={() => send(s.text)}
                    className="group text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100 rounded-xl px-4 py-3.5 transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg leading-none mt-0.5">{s.icon}</span>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        {s.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col animate-msg-in ${m.role === "user" ? "items-end" : "items-start"}`}
                  style={{ animationDelay: "0ms" }}
                >
                  {/* tool badges */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                      {[...new Set(m.actions)].map((a) => (
                        <span key={a} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-400 border border-slate-200 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          {ACTION_LABEL[a] ?? a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={`rounded-2xl px-4 py-3.5 text-sm shadow-sm ${
                    m.role === "user"
                      ? `text-white rounded-br-sm shadow-blue-200 ${isFull ? "max-w-xl" : "max-w-[88%]"}`
                      : `bg-white border border-slate-200 text-slate-800 rounded-bl-sm ${isFull ? "max-w-2xl" : "max-w-[88%]"}`
                  }`}
                  style={m.role === "user" ? { background: "linear-gradient(135deg, #2563eb, #4f46e5)" } : {}}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_td]:py-1 [&_th]:py-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex items-start animate-fade-in">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:160ms]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:320ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ══ INPUT ════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4">
        <div className={`flex items-end gap-3 mx-auto ${isFull ? "max-w-3xl" : ""}`}>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything…"
              rows={1}
              className="w-full resize-none text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent max-h-36 overflow-auto transition-shadow duration-150 shadow-sm hover:shadow-md"
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all duration-150 disabled:opacity-40 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-px active:translate-y-0 shrink-0"
            style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
          >
            Send
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        {isFull && (
          <p className="text-center text-xs text-slate-300 mt-2.5">Enter to send · Shift+Enter for new line</p>
        )}
      </div>
    </div>
  );
}
