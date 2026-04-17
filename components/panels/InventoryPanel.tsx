"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockEntry, SKU } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function InventoryPanel({ onClose }: { onClose: () => void }) {
  const [stock,     setStock]     = useState<StockEntry[]>([]);
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [search,    setSearch]    = useState("");
  const [filterLoc, setFilterLoc] = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ skuId:"", location:"", quantity:"", reservedQty:"" });
  const [adjustId,  setAdjustId]  = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [flash,     setFlash]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [tab,       setTab]       = useState<"stock"|"history">("stock");

  const reload = useCallback(async () => {
    const [st, sk] = await Promise.all([fetch("/api/stock").then(r => r.json()), fetch("/api/skus").then(r => r.json())]);
    setStock(st); setSkus(sk);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const locations = [...new Set(stock.map(s => s.location))].sort();
  const skuName = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const skuMin  = (id: string) => skus.find(x => x.id === id)?.minStockLevel ?? null;

  const addStock = async () => {
    if (!addForm.skuId || !addForm.location.trim()) { showFlash("SKU and location required", false); return; }
    setSaving(true);
    const res = await fetch("/api/stock", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ skuId:addForm.skuId, location:addForm.location, quantity:Number(addForm.quantity)||0, reservedQty:Number(addForm.reservedQty)||0 }) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error, false); } else { showFlash("Stock entry saved"); setShowAdd(false); setAddForm({ skuId:"", location:"", quantity:"", reservedQty:"" }); }
    setSaving(false); await reload();
  };

  const adjust = async (id: string) => {
    const qty = Number(adjustQty);
    if (isNaN(qty)) { showFlash("Enter valid quantity", false); return; }
    await fetch(`/api/stock/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ quantity: qty }) });
    showFlash("Quantity updated"); setAdjustId(null); setAdjustQty(""); await reload();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this stock entry?")) return;
    await fetch(`/api/stock/${id}`, { method:"DELETE" }); showFlash("Removed"); await reload();
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

  const status = (s: StockEntry) => {
    const min = skuMin(s.skuId);
    if (min == null) return null;
    if (s.quantity === 0) return { label:"Out", cls:"bg-red-100 text-red-700" };
    if (s.quantity <= min) return { label:"Low", cls:"bg-amber-100 text-amber-700" };
    return { label:"OK", cls:"bg-green-100 text-green-700" };
  };

  const totalValue = stock.reduce((sum, s) => sum + (skus.find(k => k.id === s.skuId)?.costPrice ?? 0) * s.quantity, 0);
  const historyEntries = [...stock].sort((a, b) => (b.lastCountDate ?? "").localeCompare(a.lastCountDate ?? ""));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Inventory</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(["stock","history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t === "stock" ? "Stock" : "History"}
            </button>
          ))}
        </div>
        {tab === "stock" && <button onClick={() => setShowAdd(v => !v)} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Add</button>}
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {flash && <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

      {tab === "stock" ? (
        <>
          {showAdd && (
            <div className="mx-4 mt-3 bg-blue-50 rounded-xl p-3 space-y-2 shrink-0">
              <p className="text-xs font-semibold text-slate-700">Add / Receive Stock</p>
              <select value={addForm.skuId} onChange={e => setAddForm(f => ({ ...f, skuId:e.target.value }))} className={inp}>
                <option value="">— select SKU —</option>
                {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
              <input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location:e.target.value }))} placeholder="Location (e.g. Warehouse A)" className={inp} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity:e.target.value }))} placeholder="Quantity" className={inp} />
                <input type="number" min={0} value={addForm.reservedQty} onChange={e => setAddForm(f => ({ ...f, reservedQty:e.target.value }))} placeholder="Reserved" className={inp} />
              </div>
              <button onClick={addStock} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">{saving ? "Saving…" : "Add Entry"}</button>
            </div>
          )}
          <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px]">
              <option value="">All locations</option>
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {visible.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-400">{stock.length === 0 ? "No stock entries yet" : "No matches"}</p>}
            {visible.map(s => {
              const st = status(s);
              const avail = s.quantity - s.reservedQty;
              return (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-700 truncate">{skuName(s.skuId)}</p>
                    <p className="text-xs text-slate-400">{s.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{s.quantity.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{avail} avail</p>
                  </div>
                  {st && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${st.cls}`}>{st.label}</span>}
                  <div className="shrink-0">
                    {adjustId === s.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs w-16 focus:outline-none" />
                        <button onClick={() => adjust(s.id)} className="text-xs text-blue-600 font-medium">✓</button>
                        <button onClick={() => setAdjustId(null)} className="text-xs text-slate-400">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setAdjustId(s.id); setAdjustQty(String(s.quantity)); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Adjust</button>
                        <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">{stock.length} entries · £{totalValue.toLocaleString(undefined, { maximumFractionDigits:0 })} stock value</div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Last Stock Count by Entry</p>
          {historyEntries.map(s => {
            const sku = skus.find(k => k.id === s.skuId);
            const avail = s.quantity - s.reservedQty;
            const st = status(s);
            return (
              <div key={s.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div className="shrink-0 text-center w-20">
                  <p className="text-xs font-semibold text-slate-700">{s.lastCountDate ?? "—"}</p>
                  <p className="text-[10px] text-slate-400">last count</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-semibold text-slate-700 truncate">{sku?.code ?? s.skuId}</p>
                  <p className="text-xs text-slate-400 truncate">{s.location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">{s.quantity.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{avail} avail</p>
                </div>
                {st ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${st.cls}`}>{st.label}</span> : <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-green-50 text-green-600">OK</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
