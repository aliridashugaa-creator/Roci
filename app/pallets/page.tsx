"use client";

import { useEffect, useState } from "react";

interface PalletRecord {
  palletId: string;
  location: string;
  sku: string;
  lastMoved: string;
}

const locationBadge = (loc: string) => {
  if (loc === "RECEIVING") return "bg-amber-100 text-amber-700";
  if (loc === "DISPATCH") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

export default function PalletsPage() {
  const [pallets, setPallets] = useState<PalletRecord[]>([]);
  const [palletId, setPalletId] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  const load = () =>
    fetch("/api/pallets").then((r) => r.json()).then(setPallets);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/pallets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ palletId, newLocation }),
    });
    const data = await res.json();
    if (res.ok) {
      setFlash(`${palletId} moved to ${data.location}`);
      setPalletId("");
      setNewLocation("");
      load();
    } else {
      setFlash(`Error: ${data.error}`);
    }
    setSaving(false);
    setTimeout(() => setFlash(""), 4000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Pallets</h2>
        <p className="text-slate-500 text-sm mt-1">Track and update pallet locations across the warehouse</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Pallet Locations</h3>
            <span className="text-xs text-slate-400">{pallets.length} pallets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3">Pallet ID</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Last Moved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pallets.map((p) => (
                  <tr key={p.palletId} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono font-medium text-slate-800">{p.palletId}</td>
                    <td className="px-6 py-3 font-mono text-slate-600">{p.sku}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${locationBadge(p.location)}`}>
                        {p.location}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs font-mono">
                      {new Date(p.lastMoved).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
                {pallets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No pallets</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Update Location</h3>
          {flash && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${flash.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {flash}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Pallet ID</label>
              <input
                list="pallet-list"
                value={palletId}
                onChange={(e) => setPalletId(e.target.value.toUpperCase())}
                placeholder="PLT-001"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="pallet-list">
                {pallets.map((p) => (
                  <option key={p.palletId} value={p.palletId} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">New Location</label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value.toUpperCase())}
                placeholder="B-04 / RECEIVING / DISPATCH"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {saving ? "Updating…" : "Update Location"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
