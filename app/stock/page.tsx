"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockEntry, SKU } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function StockPage() {
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [search, setSearch] = useState("");
  const [filterLoc, setFilterLoc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ skuId: "", location: "", quantity: "", reservedQty: "" });
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const reload = useCallback(async () => {
    const [st, sk] = await Promise.all([fetch("/api/stock").then(r => r.json()), fetch("/api/skus").then(r => r.json())]);
    setStock(st); setSkus(sk);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500); };

  const locations = [...new Set(stock.map(s => s.location))].sort();

  const skuName = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const skuMin = (id: string) => skus.find(x => x.id === id)?.minStockLevel ?? null;

  const addStock = async () => {
    if (!form.skuId || !form.location.trim()) { showFlash("SKU and location required", false); return; }
    setSaving(true);
    const res = await fetch("/api/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skuId: form.skuId, location: form.location, quantity: Number(form.quantity) || 0, reservedQty: Number(form.reservedQty) || 0 }) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error, false); } else { showFlash("Stock entry saved"); setShowAdd(false); setForm({ skuId: "", location: "", quantity: "", reservedQty: "" }); }
    setSaving(false); await reload();
  };

  const adjust = async (id: string) => {
    const qty = Number(adjustQty);
    if (isNaN(qty)) { showFlash("Enter a valid quantity", false); return; }
    await fetch(`/api/stock/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: qty }) });
    showFlash("Quantity updated"); setAdjustId(null); setAdjustQty(""); await reload();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this stock entry?")) return;
    await fetch(`/api/stock/${id}`, { method: "DELETE" }); showFlash("Removed"); await reload();
  };

  const visible = stock.filter(s => {
    if (filterLoc && s.location !== filterLoc) return false;
    if (search) {
      const q = search.toLowerCase();
      const sku = skus.find(x => x.id === s.skuId);
      if (!sku?.code.toLowerCase().includes(q) && !sku?.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stockStatus = (entry: StockEntry) => {
    const min = skuMin(entry.skuId);
    if (min == null) return null;
    if (entry.quantity === 0) return { label: "Out of stock", cls: "bg-red-100 text-red-700" };
    if (entry.quantity <= min) return { label: "Low stock", cls: "bg-amber-100 text-amber-700" };
    return { label: "OK", cls: "bg-green-100 text-green-700" };
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">Stock</h2>
          <p className="text-xs text-slate-400">{stock.length} entries</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or location…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
        <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All locations</option>
          {locations.map(l => <option key={l}>{l}</option>)}
        </select>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">+ Add Stock</button>
      </div>

      {flash && <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

      {showAdd && (
        <div className="bg-white rounded-xl border border-blue-100 p-5 mb-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">Add / Receive Stock</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">SKU *</label>
              <select value={form.skuId} onChange={e => setForm(f => ({ ...f, skuId: e.target.value }))} className={inp}>
                <option value="">— select SKU —</option>
                {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Location *</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Warehouse A" className={inp} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
              <input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className={inp} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reserved Qty</label>
              <input type="number" min={0} value={form.reservedQty} onChange={e => setForm(f => ({ ...f, reservedQty: e.target.value }))} placeholder="0" className={inp} /></div>
          </div>
          <button onClick={addStock} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">{saving ? "Saving…" : "Add Entry"}</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">{stock.length === 0 ? "No stock entries yet" : "No matches"}</td></tr>}
            {visible.map(s => {
              const status = stockStatus(s);
              const available = s.quantity - s.reservedQty;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-mono text-slate-700 max-w-[200px] truncate">{skuName(s.skuId)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.location}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{s.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{s.reservedQty}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{available}</td>
                  <td className="px-4 py-3">{status && <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>}</td>
                  <td className="px-4 py-3">
                    {adjustId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="New qty" />
                        <button onClick={() => adjust(s.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Save</button>
                        <button onClick={() => setAdjustId(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setAdjustId(s.id); setAdjustQty(String(s.quantity)); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Adjust</button>
                        <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
