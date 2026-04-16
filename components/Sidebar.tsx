"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",          label: "SKU Editor",  icon: "⊞" },
  { href: "/overview",  label: "Overview",    icon: "▦" },
  { href: "/suppliers", label: "Suppliers",   icon: "🏢" },
  { href: "/stock",     label: "Stock",       icon: "📦" },
  { href: "/projects",  label: "Projects",    icon: "📋" },
  { href: "/transport", label: "Transport",   icon: "🚛" },
  { href: "/kpis",      label: "KPIs",        icon: "📊" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-52 bg-slate-900 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Roci</p>
        <h1 className="text-white font-bold text-base leading-tight">SKU Platform</h1>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <span className="w-5 text-center text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-3 border-t border-slate-800">
        <p className="text-xs text-slate-600">v0.1.2 · Prototype</p>
      </div>
    </aside>
  );
}
