"use client";

import { useEffect, useState } from "react";
import type { SKU, StockEntry, Supplier, Project, TransportJob } from "@/lib/store";

interface AllData { skus: SKU[]; stock: StockEntry[]; suppliers: Supplier[]; projects: Project[]; transport: TransportJob[]; }

function KPI({ label, value, sub, colour }: { label: string; value: string|number; sub?: string; colour: string }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${colour}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Bar({ label, value, max, fmt, colour }: { label: string; value: number; max: number; fmt: string; colour: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>{label}</span><span className="font-semibold">{fmt} <span className="text-slate-400">({pct}%)</span></span></div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${colour}`} style={{ width:`${pct}%` }} /></div>
    </div>
  );
}

export default function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AllData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/stock").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]).then(([skus, stock, suppliers, projects, transport]) => setData({ skus, stock, suppliers, projects, transport }));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Analytics</p></div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {!data ? (
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start">
          {Array.from({ length: 6 }).map((_,i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (() => {
        const { skus, stock, suppliers, projects, transport } = data;
        const totalCost  = stock.reduce((s, e) => s + (skus.find(k => k.id === e.skuId)?.costPrice ?? 0) * e.quantity, 0);
        const totalSale  = stock.reduce((s, e) => s + (skus.find(k => k.id === e.skuId)?.salePrice ?? 0) * e.quantity, 0);
        const avail      = stock.reduce((s, e) => s + Math.max(0, e.quantity - e.reservedQty), 0);
        const lowStock   = stock.filter(e => { const m = skus.find(k => k.id === e.skuId)?.minStockLevel; return m != null && e.quantity > 0 && e.quantity <= m; });
        const outOfStock = stock.filter(e => e.quantity === 0);
        const margin     = totalSale > 0 ? Math.round(((totalSale - totalCost) / totalSale) * 100) : 0;

        const inTransit  = transport.filter(t => t.status === "in_transit").length;
        const delivered  = transport.filter(t => t.status === "delivered").length;
        const pending    = transport.filter(t => t.status === "pending").length;

        const byCategory = skus.reduce<Record<string,number>>((a,s) => { const c = s.category||"Other"; a[c]=(a[c]??0)+1; return a; }, {});
        const topCats = Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0,5);

        const suppSKU = suppliers.map(s => ({ s, n: skus.filter(k => k.supplierId === s.id).length })).filter(x => x.n > 0).sort((a,b) => b.n-a.n);

        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Stock Value"    value={`£${totalCost.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub={`£${totalSale.toLocaleString(undefined,{maximumFractionDigits:0})} at sale`} colour="border-green-500" />
              <KPI label="Gross Margin"   value={`${margin}%`} sub={`On £${totalCost.toLocaleString(undefined,{maximumFractionDigits:0})} base`} colour={margin>30?"border-teal-400":"border-amber-400"} />
              <KPI label="Available"      value={avail.toLocaleString()} sub="Qty minus reserved" colour="border-blue-400" />
              <KPI label="Stock Alerts"   value={lowStock.length + outOfStock.length} sub={`${outOfStock.length} out · ${lowStock.length} low`} colour={(lowStock.length+outOfStock.length)>0?"border-red-400":"border-slate-300"} />
              <KPI label="In Transit"     value={inTransit} sub={`${pending} pending · ${delivered} done`} colour={inTransit>0?"border-amber-400":"border-slate-300"} />
              <KPI label="Active SKUs"    value={skus.filter(s=>s.status==="active").length} sub={`${skus.filter(s=>s.status==="discontinued").length} discontinued`} colour="border-indigo-400" />
            </div>

            {/* SKUs by category */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">SKUs by Category</p>
              {topCats.length === 0 ? <p className="text-xs text-slate-400">No data</p> : (
                <div className="space-y-2.5">
                  {topCats.map(([cat, n]) => <Bar key={cat} label={cat} value={n} max={skus.length} fmt={`${n}`} colour="bg-blue-400" />)}
                </div>
              )}
            </div>

            {/* Shipments */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Shipments</p>
              <div className="space-y-2">
                {([["In Transit","in_transit","bg-blue-100 text-blue-700"],["Pending","pending","bg-amber-100 text-amber-700"],["Delivered","delivered","bg-green-100 text-green-700"],["Cancelled","cancelled","bg-slate-100 text-slate-500"]] as const).map(([lbl, st, cls]) => (
                  <div key={st} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">{lbl}</span>
                    <span className={`px-2 py-0.5 rounded font-medium ${cls}`}>{transport.filter(t => t.status === st).length}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suppliers */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Top Suppliers</p>
              {suppSKU.length === 0 ? <p className="text-xs text-slate-400">No data</p> : (
                <div className="space-y-2">
                  {suppSKU.slice(0,5).map(({ s, n }) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-700">{s.name}</p>
                        <p className="text-slate-400">{s.country} · {s.currency}</p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{n} SKUs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Operations</p>
              {projects.length === 0 ? <p className="text-xs text-slate-400">No projects</p> : (
                <div className="space-y-2.5">
                  {projects.map(p => {
                    const alloc = p.items.reduce((s,i) => s+i.qtyAllocated, 0);
                    const req   = p.items.reduce((s,i) => s+i.qtyRequired,  0);
                    const pct   = req > 0 ? Math.round((alloc/req)*100) : 100;
                    const cls: Record<Project["status"],string> = { planning:"bg-slate-100 text-slate-600", active:"bg-green-100 text-green-700", completed:"bg-blue-100 text-blue-700", cancelled:"bg-slate-100 text-slate-500", on_hold:"bg-amber-100 text-amber-700" };
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-700 truncate">{p.name}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium capitalize ${cls[p.status]}`}>{p.status.replace("_"," ")}</span>
                          </div>
                          <span className="text-xs text-slate-400">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width:`${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
