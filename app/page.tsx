"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalSKUs: number;
  totalUnits: number;
  activeTransfers: number;
  openDiscrepancies: number;
}

interface Transaction {
  id: number;
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
}

// ── KPI status logic ──────────────────────────────────────────────────────────
type Health = "green" | "amber" | "red" | "neutral";

function kpiStyle(h: Health) {
  return {
    green:   { border: "border-green-500",  badge: "bg-green-50 text-green-700",  dot: "bg-green-500"  },
    amber:   { border: "border-amber-400",  badge: "bg-amber-50 text-amber-700",  dot: "bg-amber-400"  },
    red:     { border: "border-red-500",    badge: "bg-red-50 text-red-700",      dot: "bg-red-500"    },
    neutral: { border: "border-slate-300",  badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300"  },
  }[h];
}

function StatCard({
  title, value, context, health, statusLabel,
}: {
  title: string;
  value: string | number;
  context: string;
  health: Health;
  statusLabel: string;
}) {
  const s = kpiStyle(health);
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${s.border}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {statusLabel}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{context}</p>
    </div>
  );
}

// ── activity event helpers ────────────────────────────────────────────────────
type Module = "all" | "loads" | "inventory" | "transfers" | "discrepancies";

function eventModule(event: string): Module {
  if (event.includes("LOAD") || event.includes("POD") || event.includes("SUB") || event.includes("REBOOK")) return "loads";
  if (event.includes("ARRIVAL") || event.includes("GOODS") || event.includes("PALLET") || event.includes("STOCK")) return "inventory";
  if (event.includes("TRANSFER")) return "transfers";
  if (event.includes("DISCREPANCY")) return "discrepancies";
  return "all";
}

function eventColor(event: string) {
  const m = eventModule(event);
  if (m === "loads")         return "bg-indigo-100 text-indigo-700";
  if (m === "inventory")     return "bg-green-100 text-green-700";
  if (m === "transfers")     return "bg-blue-100 text-blue-700";
  if (m === "discrepancies") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

const MODULE_LABELS: Record<Module, string> = {
  all: "All", loads: "Loads", inventory: "Inventory",
  transfers: "Transfers", discrepancies: "Discrepancies",
};

// ── quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "New Booking",   href: "/loads",         colour: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Goods In",      href: "/goods-in",      colour: "bg-green-600 hover:bg-green-700 text-white" },
  { label: "Transfer",      href: "/transfers",     colour: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Discrepancy",   href: "/discrepancies", colour: "bg-red-600 hover:bg-red-700 text-white" },
];

// ── page ──────────────────────────────────────────────────────────────────────
export default function OperationsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [moduleFilter, setModuleFilter] = useState<Module>("all");

  useEffect(() => {
    fetch("/api/reports").then((r) => r.json()).then((d) => setStats(d.summary));
    fetch("/api/transactions?limit=50").then((r) => r.json()).then(setTxns);
  }, []);

  const filtered = moduleFilter === "all"
    ? txns
    : txns.filter((t) => eventModule(t.event) === moduleFilter);

  const discHealth = (n: number): Health => n === 0 ? "green" : n <= 2 ? "amber" : "red";
  const transferHealth = (n: number): Health => n === 0 ? "neutral" : n <= 3 ? "green" : "amber";

  return (
    <div className="p-8">
      {/* header row */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Operations Overview</h2>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Quick Actions</p>
          <div className="flex gap-2 flex-wrap justify-end">
            {QUICK_ACTIONS.map(({ label, href, colour }) => (
              <Link key={href} href={href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${colour}`}>
                + {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total SKUs"
            value={stats.totalSKUs}
            context="Distinct product lines · All locations"
            health="neutral"
            statusLabel="Catalogue"
          />
          <StatCard
            title="Total Units"
            value={stats.totalUnits.toLocaleString()}
            context="On-hand stock · All locations"
            health={stats.totalUnits > 0 ? "green" : "amber"}
            statusLabel={stats.totalUnits > 0 ? "Healthy" : "Attention"}
          />
          <StatCard
            title="Active Transfers"
            value={stats.activeTransfers}
            context="Pending or in transit · Today"
            health={transferHealth(stats.activeTransfers)}
            statusLabel={stats.activeTransfers === 0 ? "None open" : "In progress"}
          />
          <StatCard
            title="Open Discrepancies"
            value={stats.openDiscrepancies}
            context="Unresolved · Last 7 days"
            health={discHealth(stats.openDiscrepancies)}
            statusLabel={
              stats.openDiscrepancies === 0 ? "All clear"
              : stats.openDiscrepancies <= 2 ? "Attention"
              : "Action required"
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse h-28" />
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-slate-700">Recent Activity</h3>

          {/* module filter */}
          <div className="flex gap-1">
            {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
              <button key={m} onClick={() => setModuleFilter(m)}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  moduleFilter === m
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}>
                {MODULE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center">
                    <p className="text-slate-500 font-medium">
                      {txns.length === 0
                        ? "No activity recorded yet"
                        : `No ${MODULE_LABELS[moduleFilter].toLowerCase()} activity`}
                    </p>
                    {txns.length === 0 && (
                      <p className="text-slate-400 text-xs mt-1">
                        Start by{" "}
                        <Link href="/loads" className="text-blue-500 hover:underline">creating a booking</Link>
                        {" "}or{" "}
                        <Link href="/goods-in" className="text-blue-500 hover:underline">logging goods-in</Link>
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${eventColor(t.event)}`}>
                        {t.event}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                      {Object.entries(t.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
