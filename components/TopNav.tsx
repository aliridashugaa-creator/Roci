"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",           label: "Map",        icon: "🗺" },
  { href: "/catalogue",  label: "Catalogue",  icon: "⊞" },
  { href: "/suppliers",  label: "Suppliers",  icon: "🏢" },
  { href: "/stock",      label: "Inventory",  icon: "📦" },
  { href: "/projects",   label: "Operations", icon: "📋" },
  { href: "/analytics",  label: "Analytics",  icon: "📊" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header className="bg-slate-900 border-b border-slate-800 shrink-0 flex items-center gap-0 h-12 px-4">
      <div className="flex items-center gap-2.5 mr-6 shrink-0">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-black leading-none">R</span>
        </div>
        <span className="text-white font-bold text-sm tracking-tight">Roci</span>
        <span className="text-slate-600 text-xs font-medium hidden sm:block">Logistics</span>
      </div>

      <nav className="flex items-center gap-0.5 flex-1">
        {nav.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <span className="text-base leading-none">{icon}</span>
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="text-xs text-slate-600 shrink-0 ml-4 hidden sm:block">v0.1.5</div>
    </header>
  );
}
