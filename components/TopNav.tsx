"use client";

import { useState } from "react";
import type { NavPanel } from "./Shell";

interface NavItem {
  id: NavPanel;
  label: string;
  icon: string;
  title: string;
  description: string;
  newLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "catalogue",  label: "Catalogue",  icon: "⊞", title: "SKU Catalogue",     description: "Products, pricing & units of measure",   newLabel: "+ SKU"      },
  { id: "suppliers",  label: "Suppliers",  icon: "🏢", title: "Supplier Directory", description: "Manage relationships, lead times & currencies", newLabel: "+ Supplier" },
  { id: "inventory",  label: "Inventory",  icon: "📦", title: "Stock & Warehousing", description: "Quantities, locations & stock alerts",     newLabel: "+ Stock"    },
  { id: "operations", label: "Operations", icon: "📋", title: "Projects & Planning", description: "Plan SKU allocations across projects",        newLabel: "+ Project"  },
  { id: "analytics",  label: "Analytics",  icon: "📊", title: "KPIs & Insights",    description: "Performance metrics across all modules"                            },
];

interface Props {
  openPanel: NavPanel | null;
  onTogglePanel: (p: NavPanel) => void;
  jobCount: number;
}

export default function TopNav({ openPanel, onTogglePanel, jobCount }: Props) {
  const [hovered, setHovered] = useState<NavPanel | null>(null);

  return (
    <header className="bg-slate-900 border-b border-slate-800 shrink-0 flex items-center h-12 px-4 z-50 relative">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mr-6 shrink-0">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-black leading-none">R</span>
        </div>
        <span className="text-white font-bold text-sm tracking-tight">Roci</span>
        <span className="text-slate-600 text-xs font-medium hidden sm:block">Logistics</span>
      </div>

      {/* Shipments indicator (always-on) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-400 mr-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
        <span className="hidden md:block">{jobCount} shipment{jobCount !== 1 ? "s" : ""} live</span>
      </div>

      {/* Nav items with hover dropdowns */}
      <nav className="flex items-center gap-0.5 flex-1">
        {NAV_ITEMS.map(item => {
          const isOpen = openPanel === item.id;
          const isHovered = hovered === item.id;
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => onTogglePanel(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isOpen
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="hidden md:block">{item.label}</span>
                <svg
                  className={`w-3 h-3 ml-0.5 hidden md:block transition-transform duration-150 ${isHovered ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isHovered && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] animate-slide-down">
                  {/* Arrow */}
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-slate-100 rotate-45" />
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-800 mb-0.5">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{item.description}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onTogglePanel(item.id); setHovered(null); }}
                        className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors ${
                          isOpen
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isOpen ? "Close" : "Open"}
                      </button>
                      {item.newLabel && (
                        <button
                          onClick={() => { onTogglePanel(item.id); setHovered(null); }}
                          className="text-xs font-semibold py-1.5 px-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          {item.newLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="text-xs text-slate-600 shrink-0 ml-4 hidden sm:block">v0.1.5</div>
    </header>
  );
}
