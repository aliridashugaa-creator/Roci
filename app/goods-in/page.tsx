"use client";

import { useEffect, useState } from "react";

interface GoodsInDoc {
  docId: string;
  sku: string;
  quantity: number;
  supplier: string;
  receivedAt: string;
  palletId: string;
}

export default function GoodsInPage() {
  const [docs, setDocs] = useState<GoodsInDoc[]>([]);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [palletId, setPalletId] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [created, setCreated] = useState<GoodsInDoc | null>(null);

  const load = () =>
    fetch("/api/goods-in").then((r) => r.json()).then(setDocs);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreated(null);
    const res = await fetch("/api/goods-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity: Number(quantity), supplier, palletId }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreated(data);
      setSku("");
      setQuantity("");
      setSupplier("");
      setPalletId("");
      load();
    } else {
      setFlash(`Error: ${data.error}`);
      setTimeout(() => setFlash(""), 4000);
    }
    setSaving(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Goods In</h2>
        <p className="text-slate-500 text-sm mt-1">Generate and review goods-in paperwork</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Documents</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-6 py-3">Doc ID</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Pallet</th>
                  <th className="px-6 py-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map((d) => (
                  <tr key={d.docId} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono font-medium text-blue-600">{d.docId}</td>
                    <td className="px-6 py-3 font-mono text-slate-700">{d.sku}</td>
                    <td className="px-6 py-3 font-semibold text-slate-700">{d.quantity.toLocaleString()}</td>
                    <td className="px-6 py-3 text-slate-600">{d.supplier}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{d.palletId}</td>
                    <td className="px-6 py-3 text-slate-400 text-xs font-mono">
                      {new Date(d.receivedAt).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No documents yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Generate Document</h3>
            {flash && (
              <div className="mb-4 px-4 py-2 rounded text-sm bg-red-50 text-red-700">{flash}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "SKU", value: sku, set: setSku, placeholder: "SKU-001", upper: true },
                { label: "Quantity", value: quantity, set: setQuantity, placeholder: "100", type: "number" },
                { label: "Supplier", value: supplier, set: setSupplier, placeholder: "Acme Supplies" },
                { label: "Pallet ID", value: palletId, set: setPalletId, placeholder: "PLT-006", upper: true },
              ].map(({ label, value, set, placeholder, type, upper }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type ?? "text"}
                    min={type === "number" ? 1 : undefined}
                    value={value}
                    onChange={(e) => set(upper ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
              >
                {saving ? "Generating…" : "Generate Document"}
              </button>
            </form>
          </div>

          {created && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
              <p className="font-semibold text-green-800 mb-2">Document Created</p>
              <div className="space-y-1 text-green-700">
                <p><span className="font-medium">Doc ID:</span> {created.docId}</p>
                <p><span className="font-medium">SKU:</span> {created.sku}</p>
                <p><span className="font-medium">Qty:</span> {created.quantity}</p>
                <p><span className="font-medium">Supplier:</span> {created.supplier}</p>
                <p><span className="font-medium">Pallet:</span> {created.palletId}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
