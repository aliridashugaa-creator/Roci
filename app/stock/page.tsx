"use client";

import { useEffect, useState } from "react";

interface InventoryItem {
  sku: string;
  quantity: number;
  lastUpdated: string;
}

export default function StockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [palletId, setPalletId] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  const load = () =>
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setInventory);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity: Number(quantity), palletId }),
    });
    const data = await res.json();
    if (res.ok) {
      setFlash(`Confirmed: ${sku} · new total ${data.newQty} units`);
      setSku("");
      setQuantity("");
      setPalletId("");
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
        <h2 className="text-2xl font-bold text-slate-800">Stock</h2>
        <p className="text-slate-500 text-sm mt-1">Inventory levels and arrival confirmations</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Inventory table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Current Inventory</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inventory.map((item) => (
                  <tr key={item.sku} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono font-medium text-slate-800">
                      {item.sku}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-slate-800">
                        {item.quantity.toLocaleString()}
                      </span>
                      <span className="text-slate-400 ml-1">units</span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs font-mono">
                      {new Date(item.lastUpdated).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                      No inventory records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Arrival form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Confirm Arrival</h3>
          {flash && (
            <div
              className={`mb-4 px-4 py-2 rounded text-sm ${
                flash.startsWith("Error")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {flash}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                SKU
              </label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="SKU-001"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Pallet ID
              </label>
              <input
                value={palletId}
                onChange={(e) => setPalletId(e.target.value.toUpperCase())}
                placeholder="PLT-006"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {saving ? "Confirming…" : "Confirm Arrival"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
