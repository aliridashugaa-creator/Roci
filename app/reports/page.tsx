"use client";

import { useEffect, useState } from "react";

interface InventoryItem {
  sku: string;
  quantity: number;
  lastUpdated: string;
}

interface TransferRequest {
  id: number;
  sku: string;
  quantity: number;
  from: string;
  to: string;
  status: string;
  createdAt: string;
}

interface Discrepancy {
  id: number;
  sku: string;
  expectedQty: number;
  actualQty: number;
  location: string;
  status: string;
  notes: string;
}

interface Report {
  generatedAt: string;
  summary: {
    totalSKUs: number;
    totalUnits: number;
    activeTransfers: number;
    openDiscrepancies: number;
  };
  inventory: InventoryItem[];
  transfers: TransferRequest[];
  discrepancies: Discrepancy[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/reports").then((r) => r.json()).then(setReport);
  }, []);

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["SKU", "Quantity", "Last Updated"],
      ...report.inventory.map((i) => [i.sku, i.quantity.toString(), i.lastUpdated]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = report?.inventory.filter(
    (i) => !filter || i.sku.toUpperCase().includes(filter.toUpperCase())
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      in_transit: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-slate-100 text-slate-500",
      open: "bg-red-100 text-red-700",
      investigating: "bg-amber-100 text-amber-700",
      resolved: "bg-green-100 text-green-700",
    };
    return map[s] ?? "bg-slate-100 text-slate-600";
  };

  if (!report) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-slate-400">Loading report…</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-500 text-sm mt-1">
            Generated at {new Date(report.generatedAt).toLocaleString("en-GB")}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total SKUs", value: report.summary.totalSKUs },
          { label: "Total Units", value: report.summary.totalUnits.toLocaleString() },
          { label: "Active Transfers", value: report.summary.activeTransfers },
          { label: "Open Discrepancies", value: report.summary.openDiscrepancies },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Inventory */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-700">Stock Levels</h3>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter SKU…"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered?.map((item) => (
                <tr key={item.sku} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-medium text-slate-800">{item.sku}</td>
                  <td className="px-6 py-3">
                    <span className="font-semibold text-slate-800">{item.quantity.toLocaleString()}</span>
                    <span className="text-slate-400 ml-1 text-xs">units</span>
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-xs font-mono">
                    {new Date(item.lastUpdated).toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transfers */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Transfer Summary</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Route</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {report.transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-400 font-mono">{t.id}</td>
                  <td className="px-6 py-3 font-mono text-slate-800">{t.sku}</td>
                  <td className="px-6 py-3 font-semibold">{t.quantity}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{t.from} → {t.to}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(t.status)}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Discrepancies */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Discrepancy Summary</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Variance</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {report.discrepancies.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-slate-800">{d.sku}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{d.location}</td>
                  <td className="px-6 py-3 font-semibold text-red-600">
                    {d.actualQty - d.expectedQty > 0 ? "+" : ""}
                    {d.actualQty - d.expectedQty}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs italic">{d.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
