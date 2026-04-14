"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

export type PanelMode = "full" | "minimised" | "hidden";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PanelMode>("full");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setAndSave = (m: PanelMode) => {
    setMode(m);
    localStorage.setItem("roci-ai-mode", m);
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Left sidebar — only shown when AI is minimised or hidden */}
      {mode !== "full" && <Sidebar />}

      {/* Main data content — only shown when AI is minimised or hidden */}
      {mode !== "full" && (
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      )}

      {/* AI panel — full screen or right sidebar */}
      {mode !== "hidden" && (
        <ChatPanel mode={mode} onModeChange={setAndSave} />
      )}

      {/* Floating restore button when fully hidden */}
      {mode === "hidden" && (
        <button
          onClick={() => setAndSave("full")}
          className="fixed bottom-6 right-6 z-50 h-12 px-5 rounded-full shadow-lg flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
        >
          <span className="text-white font-bold text-sm">Roci AI</span>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      )}
    </div>
  );
}
