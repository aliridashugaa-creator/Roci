"use client";

import { useEffect, useState, useCallback } from "react";

type CollectionKey =
  | "inventory" | "pallets" | "loads" | "transfers"
  | "discrepancies" | "goodsInDocs" | "transactions";

interface AdminData {
  counts: Record<CollectionKey, number>;
  inventory: Record<string, unknown>[];
  pallets: Record<string, unknown>[];
  loads: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  discrepancies: Record<string, unknown>[];
  goodsInDocs: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
}

const COLLECTIONS: { key: CollectionKey; label: string }[] = [
  { key: "loads",         label: "Loads" },
  { key: "inventory",     label: "Inventory" },
  { key: "pallets",       label: "Pallets" },
  { key: "transfers",     label: "Transfers" },
  { key: "discrepancies", label: "Discrepancies" },
  { key: "goodsInDocs",   label: "Goods-In Docs" },
  { key: "transactions",  label: "Transactions" },
];

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [active, setActive] = useState<CollectionKey>("loads");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [jsonView, setJsonView] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = async () => {
    if (!confirm("Delete ALL data from Redis? This cannot be undone.")) return;
    setResetting(true);
    await fetch("/api/admin", { method: "DELETE" });
    await load();
    setResetting(false);
  };

  const rows = data?.[active] ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const formatCell = (val: unknown): string => {
    if (val == null) return "—";
    if (typeof val === "boolean") return val ? "✓" : "✗";
    if (typeof val === "object") return JSON.stringify(val);
    const str = String(val);
    // truncate ISO timestamps to readable form
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
      return new Date(str).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
    }
    return str.length > 80 ? str.slice(0, 77) + "…" : str;
  };

  return (
    <div className="p-8">
      {/* header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Database Admin</h2>
          <p className="text-slate-500 text-sm mt-1">Live view of all Redis collections</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {resetting ? "Clearing…" : "Clear All Data"}
          </button>
        </div>
      </div>

      {/* count cards */}
      {data && (
        <div className="grid grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          {COLLECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`rounded-xl p-3 text-center shadow-sm transition-all border-2 ${
                active === key
                  ? "border-blue-500 bg-blue-50"
                  : "border-transparent bg-white hover:border-slate-200"
              }`}
            >
              <p className="text-xl font-bold text-slate-800">{data.counts[key]}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* collection viewer */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700">
              {COLLECTIONS.find((c) => c.key === active)?.label}
            </h3>
            <span className="text-xs text-slate-400">{rows.length} records</span>
          </div>
          <button
            onClick={() => setJsonView(!jsonView)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded transition-colors"
          >
            {jsonView ? "Table view" : "JSON view"}
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-3xl mb-2">∅</p>
            <p>No records in this collection</p>
          </div>
        ) : jsonView ? (
          <pre className="p-6 text-xs text-slate-700 overflow-auto max-h-[60vh] bg-slate-50 rounded-b-xl">
            {JSON.stringify(rows, null, 2)}
          </pre>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 align-top">
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2.5 text-slate-600 font-mono text-xs max-w-[240px] truncate"
                        title={typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                      >
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
