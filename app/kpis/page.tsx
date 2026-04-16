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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function KPIsPage() {
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

  if (!data) return (
    <div className="p-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-28 animate-pulse shadow-sm" />)}
    </div>
  );

  const { skus, stock, suppliers, projects, transport } = data;

  // Stock metrics
  const totalStockValue = stock.reduce((sum, s) => {
    const sku = skus.find(k => k.id === s.skuId);
    return sum + (sku?.costPrice ?? 0) * s.quantity;
  }, 0);

  const lowStock = stock.filter(s => {
    const sku = skus.find(k => k.id === s.skuId);
    if (!sku?.minStockLevel) return false;
    return s.quantity <= sku.minStockLevel && s.quantity > 0;
  });

  const outOfStock = stock.filter(s => s.quantity === 0);

  const totalAvailable = stock.reduce((sum, s) => sum + Math.max(0, s.quantity - s.reservedQty), 0);

  // SKU metrics
  const activeSKUs = skus.filter(s => s.status === "active").length;
  const discontinuedSKUs = skus.filter(s => s.status === "discontinued").length;

  // Category breakdown
  const byCategory = skus.reduce<Record<string, number>>((acc, s) => {
    const cat = s.category || "Uncategorised";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  // Stock value by category
  const valueByCategory = stock.reduce<Record<string, number>>((acc, s) => {
    const sku = skus.find(k => k.id === s.skuId);
    const cat = sku?.category || "Uncategorised";
    acc[cat] = (acc[cat] ?? 0) + (sku?.costPrice ?? 0) * s.quantity;
    return acc;
  }, {});

  // Supplier metrics
  const activeSuppliers = suppliers.filter(s => s.status === "active").length;
  const supplierSKUCount = suppliers.map(s => ({ supplier: s, count: skus.filter(k => k.supplierId === s.id).length })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  // Project metrics
  const activeProjects = projects.filter(p => p.status === "active").length;
  const totalProjectItems = projects.reduce((sum, p) => sum + p.items.length, 0);
  const projectAllocationRate = totalProjectItems === 0 ? 100 : Math.round(
    projects.reduce((sum, p) => sum + p.items.reduce((s, i) => s + (i.qtyRequired > 0 ? Math.min(1, i.qtyAllocated / i.qtyRequired) : 1), 0), 0) /
    totalProjectItems * 100
  );

  // Transport metrics
  const inTransit = transport.filter(t => t.status === "in_transit").length;
  const delivered = transport.filter(t => t.status === "delivered").length;
  const pending = transport.filter(t => t.status === "pending").length;

  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topValueCategories = Object.entries(valueByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="p-8 overflow-auto">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-slate-800">KPIs</h2>
        <p className="text-slate-500 text-sm mt-1">Performance metrics across all modules</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KPI label="Stock Value" value={`£${totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${stock.length} entries`} colour="border-green-500" />
        <KPI label="Available Units" value={totalAvailable.toLocaleString()} sub="Qty minus reserved" colour="border-teal-400" />
        <KPI label="Low Stock Items" value={lowStock.length} sub="At or below minimum" colour={lowStock.length > 0 ? "border-amber-400" : "border-slate-300"} />
        <KPI label="Out of Stock" value={outOfStock.length} sub="Zero quantity entries" colour={outOfStock.length > 0 ? "border-red-400" : "border-slate-300"} />
        <KPI label="Active SKUs" value={activeSKUs} sub={`${discontinuedSKUs} discontinued`} colour="border-blue-500" />
        <KPI label="Active Suppliers" value={activeSuppliers} sub={`${suppliers.length} total`} colour="border-indigo-400" />
        <KPI label="Active Projects" value={activeProjects} sub={`${projectAllocationRate}% allocation rate`} colour="border-purple-400" />
        <KPI label="In Transit" value={inTransit} sub={`${pending} pending · ${delivered} delivered`} colour={inTransit > 0 ? "border-amber-400" : "border-slate-300"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Section title="SKUs by Category">
          {topCategories.length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2">
              {topCategories.map(([cat, count]) => {
                const pct = Math.round((count / skus.length) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{cat}</span>
                      <span className="font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Stock Value by Category">
          {topValueCategories.length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
            <div className="space-y-2">
              {topValueCategories.map(([cat, val]) => {
                const pct = totalStockValue > 0 ? Math.round((val / totalStockValue) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{cat}</span>
                      <span className="font-semibold">£{val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Section title="Low Stock Alerts">
          {lowStock.length === 0 && outOfStock.length === 0 ? <p className="text-sm text-slate-400">All stock levels OK</p> : (
            <div className="space-y-2">
              {outOfStock.slice(0, 5).map(s => {
                const sku = skus.find(k => k.id === s.skuId);
                return (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-700">{sku?.code ?? "?"} · {sku?.name ?? s.skuId}</p>
                      <p className="text-xs text-slate-400">{s.location}</p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Out</span>
                  </div>
                );
              })}
              {lowStock.slice(0, 5).map(s => {
                const sku = skus.find(k => k.id === s.skuId);
                return (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-700">{sku?.code ?? "?"} · {sku?.name ?? s.skuId}</p>
                      <p className="text-xs text-slate-400">{s.location} · {s.quantity} units</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Low</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Top Suppliers by SKU Count">
          {supplierSKUCount.length === 0 ? <p className="text-sm text-slate-400">No linked SKUs</p> : (
            <div className="space-y-2">
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
        </Section>

        <Section title="Transport Summary">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Pending</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">{pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">In Transit</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{inTransit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Delivered</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{delivered}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Cancelled</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">{transport.filter(t => t.status === "cancelled").length}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total Jobs</span>
                <span className="text-xs font-bold text-slate-800">{transport.length}</span>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
