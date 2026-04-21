"use client";

import { useState } from "react";
import type { NavPanel } from "./Shell";
import type { AppNotification } from "@/lib/store";

interface NavItem {
  id: NavPanel;
  label: string;
  icon: string;
  title: string;
  description: string;
  newLabel?: string;
}

// Workspace first, Catalogue last
const NAV_ITEMS: NavItem[] = [
  { id: "workspace",  label: "Workspace",  icon: "⬡",  title: "Operations & Inventory", description: "Projects, stock & in-progress transits",       newLabel: "+ Project"  },
  { id: "suppliers",  label: "Suppliers",  icon: "🏢", title: "Supplier Directory",     description: "Manage relationships, lead times & currencies", newLabel: "+ Supplier" },
  { id: "shipments",  label: "Shipments",  icon: "🚛", title: "Shipments & Jobs",        description: "Live transport jobs and tracking",              newLabel: "+ Job"      },
  { id: "analytics",  label: "Analytics",  icon: "📊", title: "KPIs & Insights",         description: "Performance metrics across all modules"                              },
  { id: "catalogue",  label: "Catalogue",  icon: "⊞",  title: "SKU Catalogue",          description: "Products, pricing & units of measure",          newLabel: "+ SKU"      },
];

interface Props {
  openPanel: NavPanel | null;
  onTogglePanel: (p: NavPanel) => void;
  jobCount: number;
  notifications: AppNotification[];
}

export default function TopNav({ openPanel, onTogglePanel, jobCount, notifications }: Props) {
  const [hovered,    setHovered]    = useState<NavPanel | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);

  const criticalCount = notifications.filter(n => n.type === "out_of_stock").length;
  const warnCount     = notifications.filter(n => n.type !== "out_of_stock").length;
  const totalNotifs   = notifications.length;

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

      {/* Shipments live indicator */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-400 mr-2 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
        <span className="hidden md:block">{jobCount} shipment{jobCount !== 1 ? "s" : ""} live</span>
      </div>

      {/* Nav items */}
      <nav className="flex items-center gap-0.5 flex-1">
        {NAV_ITEMS.map(item => {
          const isOpen    = openPanel === item.id;
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

      {/* Notifications bell */}
      <div className="relative ml-3 shrink-0">
        <button
          onClick={() => setShowNotifs(v => !v)}
          className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${showNotifs ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {totalNotifs > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${criticalCount > 0 ? "bg-red-500 text-white" : "bg-amber-400 text-slate-900"}`}>
              {totalNotifs > 99 ? "99+" : totalNotifs}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute top-full right-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] animate-slide-down">
            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-r border-t border-slate-100 rotate-45" />
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">Alerts</p>
              {totalNotifs > 0 && (
                <div className="flex gap-2 text-[10px]">
                  {criticalCount > 0 && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{criticalCount} out of stock</span>}
                  {warnCount    > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{warnCount} low/reorder</span>}
                </div>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">No alerts — all stock levels OK</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.slice(0, 30).map(n => (
                    <div key={n.id} className="px-3 py-2.5 flex items-start gap-2.5">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.type === "out_of_stock" ? "bg-red-500" : n.type === "reorder" ? "bg-amber-500" : "bg-yellow-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{n.skuCode} — {n.skuName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{n.locationLabel}</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${n.type === "out_of_stock" ? "text-red-600" : "text-amber-600"}`}>
                          {n.type === "out_of_stock" ? "Out of stock" : n.type === "reorder" ? `Reorder — ${n.currentQty} left (threshold ${n.threshold})` : `Low stock — ${n.currentQty} left (min ${n.threshold})`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 30 && (
                    <p className="px-3 py-2 text-center text-[10px] text-slate-400">+{notifications.length - 30} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-600 shrink-0 ml-3 hidden sm:block">v0.1.6</div>
    </header>
  );
}
