"use client";

import { useEffect, useState } from "react";

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

function StatCard({
  title,
  value,
  accent,
  sub,
}: {
  title: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function eventColor(event: string) {
  if (event.includes("ARRIVAL") || event.includes("GOODS")) return "bg-green-100 text-green-700";
  if (event.includes("DISCREPANCY")) return "bg-red-100 text-red-700";
  if (event.includes("TRANSFER")) return "bg-blue-100 text-blue-700";
  if (event.includes("PALLET")) return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-600";
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setStats(d.summary));

    fetch("/api/transactions?limit=20")
      .then((r) => r.json())
      .then(setTxns);
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total SKUs"
            value={stats.totalSKUs}
            accent="border-blue-500"
            sub="distinct product lines"
          />
          <StatCard
            title="Total Units"
            value={stats.totalUnits.toLocaleString()}
            accent="border-green-500"
            sub="across all locations"
          />
          <StatCard
            title="Active Transfers"
            value={stats.activeTransfers}
            accent="border-amber-500"
            sub="pending or in transit"
          />
          <StatCard
            title="Open Discrepancies"
            value={stats.openDiscrepancies}
            accent={stats.openDiscrepancies > 0 ? "border-red-500" : "border-green-500"}
            sub="require investigation"
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse h-24" />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Recent Activity</h3>
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
              {txns.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    No transactions yet
                  </td>
                </tr>
              )}
              {txns.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleTimeString("en-GB")}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${eventColor(
                        t.event
                      )}`}
                    >
                      {t.event}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                    {Object.entries(t.details)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
