"use client";

import { useCallback, useEffect, useState } from "react";
import type { SKU, Supplier, StockEntry } from "@/lib/store";

const STATUS_BADGE: Record<SKU["status"], string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  discontinued: "bg-red-100 text-red-700",
};

interface Props {
  onClose: () => void;
  onSelectSKU: (sku: SKU) => void;
  onNewSKU: () => void;
  selectedSKUId: string | null;
  stock: StockEntry[];
}

export default function CataloguePanel({ onClose, onSelectSKU, onNewSKU, selectedSKUId, stock }: Props) {
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search,    setSearch]    = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterSt,  setFilterSt]  = useState<SKU["status"] | "">("");

  const DEFAULT_CATS = ["Electronics","Fashion","Home & Garden","Grocery","Automotive","Health & Beauty","Tools","Sports","Toys","Office","Other"];
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATS);

  const reload = useCallback(async () => {
    const [s, sup] = await Promise.all([
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
    ]);
    setSkus(s); setSuppliers(sup);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { try { const s = localStorage.getItem("roci:categories"); if (s) setCategories(JSON.parse(s)); } catch {} }, []);

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? "—";

  // Total qty across all stock entries for a SKU
  const skuQty = (id: string) => stock.filter(e => e.skuId === id).reduce((s, e) => s + e.quantity, 0);

  const visible = skus.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.code.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
    if (filterCat && s.category !== filterCat) return false;
    if (filterSt && s.status !== filterSt) return false;
    return true;
  });

  const activeCats = [...new Set(skus.map(s => s.category).filter(Boolean))].sort();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Catalogue</p>
        </div>
        <button onClick={onNewSKU} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 shrink-0 transition-colors">
          + New SKU
        </button>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, name or category…"
          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0">
            <option value="">All categories</option>
            {activeCats.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterSt} onChange={e => setFilterSt(e.target.value as SKU["status"] | "")}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-xs text-slate-400">{skus.length === 0 ? "No SKUs yet — click + New SKU to add one" : "No matches"}</p>
        )}
        <div className="divide-y divide-slate-100">
          {visible.map(s => {
            const qty = skuQty(s.id);
            const isSel = s.id === selectedSKUId;
            return (
              <button key={s.id} onClick={() => onSelectSKU(s)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 ${isSel ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-slate-700">{s.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                    {s.subcategory && <span className="text-[10px] text-slate-400 hidden sm:inline">{s.subcategory}</span>}
                  </div>
                  <p className="text-xs text-slate-600 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.category || "—"} · {supplierName(s.supplierId)}</p>
                </div>
                <div className="text-right shrink-0">
                  {s.costPrice != null && <p className="text-xs font-mono text-slate-600">£{s.costPrice.toFixed(2)}</p>}
                  {s.salePrice != null && <p className="text-xs font-mono text-slate-400">£{s.salePrice.toFixed(2)}</p>}
                  {qty > 0 && <p className="text-[10px] text-blue-600 font-semibold mt-0.5">{qty.toLocaleString()} in stock</p>}
                  {qty === 0 && s.minStockLevel != null && <p className="text-[10px] text-red-500 font-semibold mt-0.5">out of stock</p>}
                </div>
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0 flex justify-between">
        <span>{visible.length} of {skus.length} SKUs</span>
        <span>{suppliers.length} suppliers</span>
      </div>
    </div>
  );
}
