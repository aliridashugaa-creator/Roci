"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/loads", label: "Load Admin", icon: "⊡" },
  { href: "/stock", label: "Stock", icon: "▣" },
  { href: "/pallets", label: "Pallets", icon: "⊞" },
  { href: "/goods-in", label: "Goods In", icon: "↓" },
  { href: "/transfers", label: "Transfers", icon: "⇄" },
  { href: "/discrepancies", label: "Discrepancies", icon: "⚠" },
  { href: "/reports", label: "Reports", icon: "≡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
      <div className="px-6 py-6 border-b border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Roci
        </p>
        <h1 className="text-white font-bold text-lg leading-tight">
          Logistics OS
        </h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-600">v0.1.0 · Prototype</p>
      </div>
    </aside>
  );
}
