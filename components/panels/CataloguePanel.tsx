"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SKU, Supplier } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const UOM_GROUPS = [
  { label: "Count / Pack", units: ["each","pair","set","pack","box","carton","pallet","roll","sheet"] },
  { label: "Metric — Mass", units: ["mg","g","kg","tonne"] },
  { label: "Metric — Volume", units: ["ml","cl","litre"] },
  { label: "Metric — Length / Area", units: ["mm","cm","m","m²","m³"] },
  { label: "Imperial — Mass", units: ["oz","lb"] },
  { label: "Imperial — Volume", units: ["fl oz","pint","quart","gallon"] },
  { label: "Imperial — Length", units: ["in","ft","yd"] },
];

const DEFAULT_CATS = ["Electronics","Fashion","Home & Garden","Grocery","Automotive","Health & Beauty","Tools","Sports","Toys","Office","Other"];
const STATUS_OPTS: SKU["status"][] = ["active","inactive","discontinued"];
const STATUS_BADGE: Record<SKU["status"], string> = { active: "bg-green-100 text-green-700", inactive: "bg-amber-100 text-amber-700", discontinued: "bg-red-100 text-red-700" };

const BLANK: Omit<SKU, "id"|"createdAt"|"updatedAt"> = {
  code:"", name:"", description:"", category:"", subcategory:"",
  supplierId:"", supplierCode:"", unitOfMeasure:"each",
  costPrice:null, salePrice:null, weight:null, dimensions:"",
  barcode:"", minStockLevel:null, reorderPoint:null, leadTimeDays:null,
  status:"active", notes:"",
};

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}

export default function CataloguePanel({ onClose }: { onClose: () => void }) {
  const [skus,       setSkus]       = useState<SKU[]>([]);
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATS);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [view,       setView]       = useState<"list"|"edit">("list");
  const [selected,   setSelected]   = useState<SKU | null>(null);
  const [isNew,      setIsNew]      = useState(false);
  const [form,       setForm]       = useState<typeof BLANK>(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [addingCat,  setAddingCat]  = useState(false);
  const [newCat,     setNewCat]     = useState("");
  const catRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [s, sup] = await Promise.all([fetch("/api/skus").then(r => r.json()), fetch("/api/suppliers").then(r => r.json())]);
    setSkus(s); setSuppliers(sup);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { try { const s = localStorage.getItem("roci:categories"); if (s) setCategories(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { if (addingCat) catRef.current?.focus(); }, [addingCat]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const num = (v: string) => v === "" ? null : Number(v);

  const openNew  = () => { setIsNew(true); setSelected(null); setForm(BLANK); setView("edit"); };
  const openEdit = (s: SKU) => { setIsNew(false); setSelected(s); setForm({ code:s.code, name:s.name, description:s.description, category:s.category, subcategory:s.subcategory, supplierId:s.supplierId, supplierCode:s.supplierCode, unitOfMeasure:s.unitOfMeasure, costPrice:s.costPrice, salePrice:s.salePrice, weight:s.weight, dimensions:s.dimensions, barcode:s.barcode, minStockLevel:s.minStockLevel, reorderPoint:s.reorderPoint, leadTimeDays:s.leadTimeDays, status:s.status, notes:s.notes }); setView("edit"); };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { showFlash("Code and name required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/skus", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      : await fetch(`/api/skus/${selected!.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.code} created` : `${data.code} saved`);
    setSaving(false); await reload();
    if (isNew) { setIsNew(false); setSelected(data); }
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.code}?`)) return;
    await fetch(`/api/skus/${selected.id}`, { method:"DELETE" });
    showFlash(`${selected.code} deleted`); setView("list"); await reload();
  };

  const addCat = () => { const c = newCat.trim(); if (!c) return; const cats = categories.includes(c) ? categories : [...categories, c].sort(); setCategories(cats); try { localStorage.setItem("roci:categories", JSON.stringify(cats)); } catch {} setForm(p => ({ ...p, category: c })); setNewCat(""); setAddingCat(false); };

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? "—";

  const visible = skus.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.code.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
    if (filterCat && s.category !== filterCat) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        {view === "edit" ? (
          <button onClick={() => setView("list")} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Catalogue</p>
          {view === "edit" && <p className="text-sm font-bold text-slate-800 truncate">{isNew ? "New SKU" : `${form.code} · ${form.name}`}</p>}
        </div>
        {view === "list" && (
          <>
            <button onClick={openNew} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 shrink-0">+ New SKU</button>
          </>
        )}
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {flash && <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

      {view === "list" ? (
        <>
          <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-400">{skus.length === 0 ? "No SKUs yet" : "No matches"}</p>}
            <div className="divide-y divide-slate-100">
              {visible.map(s => (
                <button key={s.id} onClick={() => openEdit(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-slate-700">{s.code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.category || "—"} · {supplierName(s.supplierId)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.costPrice != null && <p className="text-xs font-mono text-slate-600">£{s.costPrice.toFixed(2)}</p>}
                    {s.salePrice != null && <p className="text-xs font-mono text-slate-400">£{s.salePrice.toFixed(2)}</p>}
                  </div>
                  <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">{skus.length} SKUs · {suppliers.length} suppliers</div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Identity */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="SKU Code *"><input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())} className={inp} /></F>
              <F label="Status"><select value={form.status} onChange={e => f("status", e.target.value as SKU["status"])} className={inp}>{STATUS_OPTS.map(s => <option key={s}>{s}</option>)}</select></F>
            </div>
            <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
            <F label="Description"><textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                  <button onClick={() => setAddingCat(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{addingCat ? "Cancel" : "+ Add"}</button>
                </div>
                {addingCat ? (
                  <div className="flex gap-1">
                    <input ref={catRef} value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCat(); if (e.key === "Escape") setAddingCat(false); }} placeholder="New category…" className="flex-1 border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <button onClick={addCat} className="bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                ) : (
                  <select value={form.category} onChange={e => f("category", e.target.value)} className={inp}><option value="">— select —</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
                )}
              </div>
              <F label="Subcategory"><input value={form.subcategory} onChange={e => f("subcategory", e.target.value)} className={inp} /></F>
            </div>
          </div>
          {/* Sourcing */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Sourcing</p>
            <F label="Supplier">
              <select value={form.supplierId} onChange={e => f("supplierId", e.target.value)} className={inp}>
                <option value="">— none —</option>
                {suppliers.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Supplier Code"><input value={form.supplierCode} onChange={e => f("supplierCode", e.target.value)} className={inp} /></F>
              <F label="Lead Time (days)"><input type="number" min={0} value={form.leadTimeDays ?? ""} onChange={e => f("leadTimeDays", num(e.target.value))} className={inp} /></F>
            </div>
          </div>
          {/* Pricing */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Pricing & Unit</p>
            <div className="grid grid-cols-3 gap-3">
              <F label="Unit">
                <select value={form.unitOfMeasure} onChange={e => f("unitOfMeasure", e.target.value)} className={inp}>
                  {UOM_GROUPS.map(g => <optgroup key={g.label} label={g.label}>{g.units.map(u => <option key={u}>{u}</option>)}</optgroup>)}
                </select>
              </F>
              <F label="Cost (£)"><input type="number" step="0.01" min={0} value={form.costPrice ?? ""} onChange={e => f("costPrice", num(e.target.value))} className={inp} /></F>
              <F label="Sale (£)"><input type="number" step="0.01" min={0} value={form.salePrice ?? ""} onChange={e => f("salePrice", num(e.target.value))} className={inp} /></F>
            </div>
          </div>
          {/* Physical */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Physical</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Weight (kg)"><input type="number" step="0.001" min={0} value={form.weight ?? ""} onChange={e => f("weight", num(e.target.value))} className={inp} /></F>
              <F label="Dimensions"><input value={form.dimensions} onChange={e => f("dimensions", e.target.value)} placeholder="L×W×H cm" className={inp} /></F>
            </div>
            <F label="Barcode"><input value={form.barcode} onChange={e => f("barcode", e.target.value)} className={inp} /></F>
          </div>
          {/* Inventory rules */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Inventory Rules</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Min Stock"><input type="number" min={0} value={form.minStockLevel ?? ""} onChange={e => f("minStockLevel", num(e.target.value))} className={inp} /></F>
              <F label="Reorder Point"><input type="number" min={0} value={form.reorderPoint ?? ""} onChange={e => f("reorderPoint", num(e.target.value))} className={inp} /></F>
            </div>
          </div>
          <F label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>
        </div>
      )}

      {view === "edit" && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-3 flex gap-3 bg-white">
          <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
            {saving ? "Saving…" : isNew ? "Create SKU" : "Save Changes"}
          </button>
          {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">Delete</button>}
        </div>
      )}
    </div>
  );
}
