"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

export type PanelMode = "wide" | "sidebar" | "hidden";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PanelMode>("wide");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("roci-ai-mode") as PanelMode | null;
    if (saved) setMode(saved);
    setMounted(true);
  }, []);

  const setAndSave = (m: PanelMode) => {
    setMode(m);
    localStorage.setItem("roci-ai-mode", m);
  };

  // Avoid layout flash before localStorage is read
  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* main content area — hidden in wide mode */}
      <main
        className={`overflow-auto min-w-0 transition-all duration-300 ${
          mode === "wide" ? "w-0 overflow-hidden" : "flex-1"
        }`}
      >
        {children}
      </main>

      {/* AI panel */}
      <ChatPanel mode={mode} onModeChange={setAndSave} />

      {/* floating re-open button when hidden */}
      {mode === "hidden" && (
        <button
          onClick={() => setAndSave("sidebar")}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center transition-colors"
          title="Open Roci AI"
        >
          <span className="text-white font-bold text-sm">AI</span>
        </button>
      )}
    </div>
  );
}
