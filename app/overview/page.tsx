"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalSKUs: number; activeSKUs: number; inactiveSKUs: number; discontinuedSKUs: number;
  totalSuppliers: number; activeSuppliers: number;
  totalStockEntries: number; totalStockValue: number; lowStockItems: number;
  activeProjects: number; totalProjects: number;
  transportPending: number; transportInTransit: number; transportDelivered: number;
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

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => { fetch("/api/overview").then(r => r.json()).then(setStats); }, []);

  if (!stats) return (
    <div className="p-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-28 animate-pulse shadow-sm" />)}
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
        <p className="text-slate-500 text-sm mt-1">Live summary across all modules</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KPI label="Total SKUs"      value={stats.totalSKUs}      sub={`${stats.activeSKUs} active · ${stats.inactiveSKUs} inactive`} colour="border-blue-500" />
        <KPI label="Stock Value"     value={`£${stats.totalStockValue.toLocaleString()}`} sub={`${stats.totalStockEntries} entries`} colour="border-green-500" />
        <KPI label="Low Stock"       value={stats.lowStockItems}   sub="Items at or below minimum" colour={stats.lowStockItems > 0 ? "border-red-400" : "border-slate-300"} />
        <KPI label="Suppliers"       value={stats.totalSuppliers}  sub={`${stats.activeSuppliers} active`} colour="border-indigo-400" />
        <KPI label="Active Projects" value={stats.activeProjects}  sub={`${stats.totalProjects} total`} colour="border-purple-400" />
        <KPI label="Transport In Transit" value={stats.transportInTransit} sub={`${stats.transportPending} pending`} colour={stats.transportInTransit > 0 ? "border-amber-400" : "border-slate-300"} />
        <KPI label="Delivered"       value={stats.transportDelivered} sub="Completed transport jobs" colour="border-teal-400" />
        <KPI label="Discontinued"    value={stats.discontinuedSKUs} sub="SKUs to review" colour={stats.discontinuedSKUs > 0 ? "border-orange-400" : "border-slate-300"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/",          label: "SKU Editor",  desc: "Create and manage your SKU catalogue",  colour: "hover:border-blue-300"    },
          { href: "/suppliers", label: "Suppliers",   desc: "Manage your supplier relationships",    colour: "hover:border-indigo-300"  },
          { href: "/stock",     label: "Stock",       desc: "View and adjust inventory levels",      colour: "hover:border-green-300"   },
          { href: "/projects",  label: "Projects",    desc: "Track projects and SKU allocations",    colour: "hover:border-purple-300"  },
          { href: "/transport", label: "Transport",   desc: "Manage inbound and outbound jobs",      colour: "hover:border-amber-300"   },
          { href: "/kpis",      label: "KPIs",        desc: "Performance metrics and insights",      colour: "hover:border-teal-300"    },
        ].map(({ href, label, desc, colour }) => (
          <Link key={href} href={href}
            className={`bg-white rounded-xl p-5 shadow-sm border border-slate-200 ${colour} transition-colors group`}>
            <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{label}</p>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
