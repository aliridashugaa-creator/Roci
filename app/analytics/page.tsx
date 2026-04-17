"use client";

import { useEffect, useState } from "react";
import type { SKU, StockEntry, Supplier, Project, TransportJob } from "@/lib/store";

interface AllData {
  skus: SKU[];
  stock: StockEntry[];
  suppliers: Supplier[];
  projects: Project[];
  transport: TransportJob[];
}

function KPI({ label, value, sub, colour }: { label: string; value: string | number; sub?: string; colour: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${colour}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Bar({ label, value, max, fmt, colour }: { label: string; value: number; max: number; fmt: string; colour: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{fmt} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AllData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/stock").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]).then(([skus, stock, suppliers, projects, transport]) =>
      setData({ skus, stock, suppliers, projects, transport })
    );
  }, []);

  if (!data) return (
    <div className="p-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl h-28 animate-pulse shadow-sm" />
      ))}
    </div>
  );

  const { skus, stock, suppliers, projects, transport } = data;

  // ── derived metrics ──────────────────────────────────────────────────────────
  const totalStockValue = stock.reduce((sum, s) => {
    const sku = skus.find(k => k.id === s.skuId);
    return sum + (sku?.costPrice ?? 0) * s.quantity;
  }, 0);
  const totalSaleValue = stock.reduce((sum, s) => {
    const sku = skus.find(k => k.id === s.skuId);
    return sum + (sku?.salePrice ?? 0) * s.quantity;
  }, 0);
  const totalAvailable = stock.reduce((sum, s) => sum + Math.max(0, s.quantity - s.reservedQty), 0);
  const lowStock = stock.filter(s => {
    const sku = skus.find(k => k.id === s.skuId);
    return sku?.minStockLevel != null && s.quantity > 0 && s.quantity <= sku.minStockLevel;
  });
  const outOfStock = stock.filter(s => s.quantity === 0);

  const activeSKUs = skus.filter(s => s.status === "active").length;
  const discontinuedSKUs = skus.filter(s => s.status === "discontinued").length;
  const activeSuppliers = suppliers.filter(s => s.status === "active").length;
  const activeProjects = projects.filter(p => p.status === "active").length;

  const totalProjectItems = projects.reduce((sum, p) => sum + p.items.length, 0);
  const allocationRate = totalProjectItems === 0 ? 100 : Math.round(
    projects.reduce((sum, p) => sum + p.items.reduce((s, i) =>
      s + (i.qtyRequired > 0 ? Math.min(1, i.qtyAllocated / i.qtyRequired) : 1), 0), 0
    ) / totalProjectItems * 100
  );

  const inTransit = transport.filter(t => t.status === "in_transit").length;
  const delivered = transport.filter(t => t.status === "delivered").length;
  const pending = transport.filter(t => t.status === "pending").length;
  const cancelled = transport.filter(t => t.status === "cancelled").length;

  // ── breakdown data ───────────────────────────────────────────────────────────
  const byCategory = skus.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || "Uncategorised";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const valueByCategory = stock.reduce<Record<string, number>>((acc, s) => {
    const sku = skus.find(k => k.id === s.skuId);
    const cat = sku?.category || "Uncategorised";
    acc[cat] = (acc[cat] ?? 0) + (sku?.costPrice ?? 0) * s.quantity;
    return acc;
  }, {});
  const supplierSKUCount = suppliers
    .map(s => ({ supplier: s, count: skus.filter(k => k.supplierId === s.id).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topValueCats  = Object.entries(valueByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const grossMargin = totalSaleValue > 0
    ? Math.round(((totalSaleValue - totalStockValue) / totalSaleValue) * 100)
    : 0;

  return (
    <div className="p-8 overflow-auto">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
        <p className="text-slate-500 text-sm mt-1">Live performance metrics across all modules</p>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KPI label="Stock Value"       value={`£${totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`£${totalSaleValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} at sale`} colour="border-green-500" />
        <KPI label="Gross Margin"      value={`${grossMargin}%`} sub={`On £${totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} cost base`} colour={grossMargin > 30 ? "border-teal-400" : "border-amber-400"} />
        <KPI label="Available Units"   value={totalAvailable.toLocaleString()} sub="Qty minus reserved" colour="border-blue-400" />
        <KPI label="Low / Out of Stock" value={lowStock.length + outOfStock.length} sub={`${outOfStock.length} out · ${lowStock.length} low`} colour={(lowStock.length + outOfStock.length) > 0 ? "border-red-400" : "border-slate-300"} />
        <KPI label="Active SKUs"       value={activeSKUs} sub={`${discontinuedSKUs} discontinued`} colour="border-indigo-400" />
        <KPI label="Active Suppliers"  value={activeSuppliers} sub={`${suppliers.length} total`} colour="border-purple-400" />
        <KPI label="Active Operations" value={activeProjects} sub={`${allocationRate}% allocation rate`} colour="border-fuchsia-400" />
        <KPI label="In Transit"        value={inTransit} sub={`${pending} pending · ${delivered} delivered`} colour={inTransit > 0 ? "border-amber-400" : "border-slate-300"} />
      </div>

      {/* ── breakdowns row 1 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card title="SKUs by Category">
          {topCategories.length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2.5">
              {topCategories.map(([cat, count]) => (
                <Bar key={cat} label={cat} value={count} max={skus.length}
                  fmt={`${count}`} colour="bg-blue-400" />
              ))}
            </div>
          )}
        </Card>

        <Card title="Stock Value by Category">
          {topValueCats.length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2.5">
              {topValueCats.map(([cat, val]) => (
                <Bar key={cat} label={cat} value={val} max={totalStockValue}
                  fmt={`£${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colour="bg-green-400" />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── breakdowns row 2 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card title="Shipment Status">
          <div className="space-y-3">
            {[
              { label: "In Transit", value: inTransit, cls: "bg-blue-100 text-blue-700" },
              { label: "Pending",    value: pending,   cls: "bg-amber-100 text-amber-700" },
              { label: "Delivered",  value: delivered, cls: "bg-green-100 text-green-700" },
              { label: "Cancelled",  value: cancelled, cls: "bg-slate-100 text-slate-500" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-slate-600">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{value}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">Total Jobs</span>
              <span className="text-xs font-bold text-slate-800">{transport.length}</span>
            </div>
          </div>
        </Card>

        <Card title="Top Suppliers">
          {supplierSKUCount.length === 0 ? <p className="text-sm text-slate-400">No linked SKUs</p> : (
            <div className="space-y-2.5">
              {supplierSKUCount.slice(0, 6).map(({ supplier, count }) => (
                <div key={supplier.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{supplier.name}</p>
                    <p className="text-xs text-slate-400">{supplier.country || "—"} · {supplier.currency}</p>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{count} SKUs</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Stock Alerts">
          {lowStock.length === 0 && outOfStock.length === 0
            ? <p className="text-sm text-slate-400">All stock levels OK</p>
            : (
              <div className="space-y-2">
                {outOfStock.slice(0, 4).map(s => {
                  const sku = skus.find(k => k.id === s.skuId);
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{sku?.code ?? "?"}</p>
                        <p className="text-xs text-slate-400">{s.location}</p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Out</span>
                    </div>
                  );
                })}
                {lowStock.slice(0, 4).map(s => {
                  const sku = skus.find(k => k.id === s.skuId);
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{sku?.code ?? "?"}</p>
                        <p className="text-xs text-slate-400">{s.quantity} units · {s.location}</p>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Low</span>
                    </div>
                  );
                })}
              </div>
            )}
        </Card>
      </div>

      {/* ── operations overview ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Operations Overview">
          {projects.length === 0 ? <p className="text-sm text-slate-400">No projects</p> : (
            <div className="space-y-3">
              {projects.map(p => {
                const allocated = p.items.reduce((s, i) => s + i.qtyAllocated, 0);
                const required  = p.items.reduce((s, i) => s + i.qtyRequired, 0);
                const pct = required > 0 ? Math.round((allocated / required) * 100) : 100;
                const colours: Record<Project["status"], string> = {
                  planning:  "bg-slate-100 text-slate-600",
                  active:    "bg-green-100 text-green-700",
                  completed: "bg-blue-100 text-blue-700",
                  cancelled: "bg-slate-100 text-slate-500",
                  on_hold:   "bg-amber-100 text-amber-700",
                };
                return (
                  <div key={p.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${colours[p.status]}`}>{p.status.replace("_"," ")}</span>
                      </div>
                      <span className="text-xs text-slate-400">{pct}% allocated</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Recent Shipments">
          {transport.length === 0 ? <p className="text-sm text-slate-400">No shipments</p> : (
            <div className="space-y-2">
              {transport.slice(0, 6).map(t => {
                const dot: Record<TransportJob["status"], string> = {
                  pending: "bg-amber-400", in_transit: "bg-blue-500",
                  delivered: "bg-green-500", cancelled: "bg-slate-400",
                };
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot[t.status]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-slate-700">{t.ref}</p>
                      <p className="text-xs text-slate-400 truncate">{t.origin} → {t.destination}</p>
                    </div>
                    {t.scheduledDate && <span className="text-xs text-slate-400 shrink-0">{t.scheduledDate}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
