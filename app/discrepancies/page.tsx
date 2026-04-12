"use client";

import { useEffect, useState } from "react";

interface Discrepancy {
  id: number;
  sku: string;
  expectedQty: number;
  actualQty: number;
  location: string;
  status: "open" | "investigating" | "resolved";
  notes: string;
  createdAt: string;
  resolvedAt?: string;
}

const statusBadge = (s: Discrepancy["status"]) => {
  const map = {
    open: "bg-red-100 text-red-700",
    investigating: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
  };
  return map[s];
};

export default function DiscrepanciesPage() {
  const [items, setItems] = useState<Discrepancy[]>([]);
  const [sku, setSku] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () =>
    fetch("/api/discrepancies").then((r) => r.json()).then(setItems);

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/discrepancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, expectedQty: Number(expectedQty), actualQty: Number(actualQty), location, notes }),
    });
    const data = await res.json();
    if (res.ok) {
      setFlash(`Discrepancy #${data.id} reported`);
      setSku("");
      setExpectedQty("");
      setActualQty("");
      setLocation("");
      setNotes("");
      load();
    } else {
      setFlash(`Error: ${data.error}`);
    }
    setSaving(false);
    setTimeout(() => setFlash(""), 4000);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await fetch(`/api/discrepancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Discrepancies</h2>
        <p className="text-slate-500 text-sm mt-1">Log and investigate stock count discrepancies</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Discrepancy Log</h3>
            <span className="text-xs text-slate-400">
              {items.filter((d) => d.status !== "resolved").length} open
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {items.map((d) => (
              <div key={d.id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-medium text-slate-800">{d.sku}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(d.status)}`}>
                        {d.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{d.location}</span>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">
                      Expected{" "}
                      <span className="font-semibold text-slate-800">{d.expectedQty}</span>
                      {" · "}
                      Actual{" "}
                      <span className="font-semibold text-red-600">{d.actualQty}</span>
                      {" · "}
                      <span className={`font-semibold ${d.actualQty - d.expectedQty < 0 ? "text-red-600" : "text-green-600"}`}>
                        {d.actualQty - d.expectedQty > 0 ? "+" : ""}
                        {d.actualQty - d.expectedQty}
                      </span>
                    </div>
                    {d.notes && <p className="text-xs text-slate-500 italic">{d.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {d.status === "open" && (
                      <button
                        onClick={() => updateStatus(d.id, "investigating")}
                        disabled={updating === d.id}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        Investigate
                      </button>
                    )}
                    {d.status === "investigating" && (
                      <button
                        onClick={() => updateStatus(d.id, "resolved")}
                        disabled={updating === d.id}
                        className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400">No discrepancies recorded</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Report Discrepancy</h3>
          {flash && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${flash.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {flash}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="SKU-003" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Expected</label>
                <input type="number" min="0" value={expectedQty} onChange={(e) => setExpectedQty(e.target.value)} placeholder="100" required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Actual</label>
                <input type="number" min="0" value={actualQty} onChange={(e) => setActualQty(e.target.value)} placeholder="75" required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value.toUpperCase())} placeholder="B-01" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the issue…" rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
              {saving ? "Reporting…" : "Report Discrepancy"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
