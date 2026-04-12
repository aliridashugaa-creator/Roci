"use client";

import { useEffect, useState } from "react";

interface TransferRequest {
  id: number;
  sku: string;
  quantity: number;
  from: string;
  to: string;
  status: "pending" | "in_transit" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

const statusBadge = (s: TransferRequest["status"]) => {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    in_transit: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return map[s];
};

const statusLabel = (s: string) => s.replace("_", " ");

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () =>
    fetch("/api/transfers").then((r) => r.json()).then(setTransfers);

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity: Number(quantity), from, to }),
    });
    const data = await res.json();
    if (res.ok) {
      setFlash(`Transfer #${data.id} created`);
      setSku("");
      setQuantity("");
      setFrom("");
      setTo("");
      load();
    } else {
      setFlash(`Error: ${data.error}`);
    }
    setSaving(false);
    setTimeout(() => setFlash(""), 4000);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await fetch(`/api/transfers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  };

  const nextAction = (t: TransferRequest) => {
    if (t.status === "pending") return { label: "Start Transit", next: "in_transit" };
    if (t.status === "in_transit") return { label: "Complete", next: "completed" };
    return null;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Transfers</h2>
        <p className="text-slate-500 text-sm mt-1">Manage stock movement requests between locations</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Transfer Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Route</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transfers.map((t) => {
                  const action = nextAction(t);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-400 font-mono">{t.id}</td>
                      <td className="px-6 py-3 font-mono font-medium text-slate-800">{t.sku}</td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{t.quantity}</td>
                      <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                        {t.from} → {t.to}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(t.status)}`}>
                          {statusLabel(t.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {action && (
                          <button
                            onClick={() => updateStatus(t.id, action.next)}
                            disabled={updating === t.id}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            {updating === t.id ? "…" : action.label}
                          </button>
                        )}
                        {t.status === "pending" && (
                          <button
                            onClick={() => updateStatus(t.id, "cancelled")}
                            disabled={updating === t.id}
                            className="text-xs text-red-400 hover:text-red-600 font-medium ml-3 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No transfer requests</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4">New Transfer Request</h3>
          {flash && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${flash.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {flash}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="SKU-001" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="50" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">From Location</label>
              <input value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} placeholder="A-01" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">To Location</label>
              <input value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} placeholder="DISPATCH" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
              {saving ? "Creating…" : "Create Request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
