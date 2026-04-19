"use client";

import { useCallback, useEffect, useState } from "react";
import type { Supplier, SKU, TransportJob } from "@/lib/store";

interface Props {
  onClose: () => void;
  onSelectSupplier: (s: Supplier) => void;
  onNewSupplier: () => void;
  selectedSupplierId: string | null;
}

const DOT: Record<TransportJob["status"], string> = { pending: "bg-amber-400", in_transit: "bg-blue-500", delivered: "bg-green-500", cancelled: "bg-slate-400" };
const LBL: Record<TransportJob["status"], string> = { pending: "Pending", in_transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled" };

export default function SuppliersPanel({ onClose, onSelectSupplier, onNewSupplier, selectedSupplierId }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [transport, setTransport] = useState<TransportJob[]>([]);
  const [search,    setSearch]    = useState("");
  const [listTab,   setListTab]   = useState<"active" | "history">("active");

  const reload = useCallback(async () => {
    const [s, sk, tr] = await Promise.all([
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]);
    setSuppliers(s); setSkus(sk); setTransport(tr);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const skuCount = (id: string) => skus.filter(s => s.supplierId === id).length;

  const grouped = (() => {
    const hq         = suppliers.filter(s => s.locations?.some(l => l.type === "hq"        && l.isPrimary) || !s.locations?.length);
    const depots     = suppliers.filter(s => s.locations?.some(l => l.type === "depot"     && l.isPrimary) && !hq.includes(s));
    const warehouses = suppliers.filter(s => s.locations?.some(l => l.type === "warehouse" && l.isPrimary) && !hq.includes(s) && !depots.includes(s));
    const other      = suppliers.filter(s => !hq.includes(s) && !depots.includes(s) && !warehouses.includes(s));
    return { hq, depots, warehouses, other };
  })();

  const visible = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.country.toLowerCase().includes(search.toLowerCase())
  );

  const history = transport.flatMap(job =>
    job.items.flatMap(item => {
      const sku = skus.find(k => k.id === item.skuId);
      if (!sku) return [];
      const sup = suppliers.find(s => s.id === sku.supplierId);
      if (!sup) return [];
      return [{ job, sku, supplier: sup }];
    })
  ).sort((a, b) => (b.job.scheduledDate ?? "").localeCompare(a.job.scheduledDate ?? ""));

  const SupplierRow = ({ s }: { s: Supplier }) => (
    <button
      onClick={() => onSelectSupplier(s)}
      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 ${selectedSupplierId === s.id ? "bg-blue-50" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
        </div>
        <p className="text-xs text-slate-400 truncate">{s.country || "—"} · {s.currency} · {s.leadTimeDays}d lead</p>
        {s.locations && s.locations.length > 0 && (
          <p className="text-[10px] text-slate-400 truncate">
            {s.locations.filter(l => l.isPrimary).map(l => l.city || l.address).join(", ") || s.locations[0].city || s.locations[0].address}
          </p>
        )}
      </div>
      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium shrink-0">{skuCount(s.id)} SKUs</span>
      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(["active", "history"] as const).map(t => (
              <button key={t} onClick={() => setListTab(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${listTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "active" ? "Suppliers" : "History"}
              </button>
            ))}
          </div>
          {listTab === "active" && (
            <button onClick={onNewSupplier} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">+ New</button>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {listTab === "active" && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…"
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {listTab === "active" ? (
        <>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-slate-400">{suppliers.length === 0 ? "No suppliers yet" : "No matches"}</p>
            )}
            {!search ? (
              <>
                {grouped.hq.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Headquarters</p>
                    <div className="divide-y divide-slate-100">{grouped.hq.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.depots.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Depots</p>
                    <div className="divide-y divide-slate-100">{grouped.depots.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.warehouses.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouses</p>
                    <div className="divide-y divide-slate-100">{grouped.warehouses.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.other.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Other</p>
                    <div className="divide-y divide-slate-100">{grouped.other.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="divide-y divide-slate-100">{visible.map(s => <SupplierRow key={s.id} s={s} />)}</div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">
            {suppliers.length} suppliers · {skus.length} linked SKUs
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Shipment Activity by Supplier</p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400">No activity yet</p>
          ) : history.map(({ job, sku, supplier }, i) => (
            <div key={`${job.id}-${i}`} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${DOT[job.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-mono font-bold text-slate-700">{job.ref}</span>
                  <span className="text-xs text-slate-500">{job.origin} → {job.destination}</span>
                </div>
                <p className="text-xs text-slate-500"><span className="font-medium">{supplier.name}</span> · <span className="font-mono">{sku.code}</span></p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium block mb-0.5 ${
                  job.status === "delivered"  ? "bg-green-100 text-green-700"  :
                  job.status === "in_transit" ? "bg-blue-100 text-blue-700"   :
                  job.status === "pending"    ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-500"}`}>
                  {LBL[job.status]}
                </span>
                {job.scheduledDate && <span className="text-[10px] text-slate-400">{job.scheduledDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
