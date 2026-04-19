"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SKU, Supplier, StockEntry } from "@/lib/store";

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

interface Props {
  sku: SKU | null;
  isNew: boolean;
  stock: StockEntry[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SKUEditPanel({ sku, isNew, stock, onClose, onSaved, onDeleted }: Props) {
  const [suppliers,   setSuppliers]   = useState<Supplier[]>([]);
  const [categories,  setCategories]  = useState<string[]>(DEFAULT_CATS);
  const [form,        setForm]        = useState<typeof BLANK>(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [flash,       setFlash]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [addingCat,   setAddingCat]   = useState(false);
  const [newCat,      setNewCat]      = useState("");
  const [addingSupp,  setAddingSupp]  = useState(false);
  const [newSupp,     setNewSupp]     = useState({ name:"", country:"", currency:"GBP" });
  const catRef = useRef<HTMLInputElement>(null);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const num = (v: string) => v === "" ? null : Number(v);

  const loadSuppliers = useCallback(async () => {
    const sup = await fetch("/api/suppliers").then(r => r.json());
    setSuppliers(sup);
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => { try { const s = localStorage.getItem("roci:categories"); if (s) setCategories(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { if (addingCat) catRef.current?.focus(); }, [addingCat]);

  // Sync form when sku prop changes
  useEffect(() => {
    if (isNew || !sku) {
      setForm(BLANK);
    } else {
      setForm({
        code: sku.code, name: sku.name, description: sku.description,
        category: sku.category, subcategory: sku.subcategory,
        supplierId: sku.supplierId, supplierCode: sku.supplierCode,
        unitOfMeasure: sku.unitOfMeasure, costPrice: sku.costPrice,
        salePrice: sku.salePrice, weight: sku.weight, dimensions: sku.dimensions,
        barcode: sku.barcode, minStockLevel: sku.minStockLevel,
        reorderPoint: sku.reorderPoint, leadTimeDays: sku.leadTimeDays,
        status: sku.status, notes: sku.notes,
      });
    }
  }, [sku, isNew]);

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { showFlash("Code and name required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/skus", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      : await fetch(`/api/skus/${sku!.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.code} created` : `${data.code} saved`);
    setSaving(false); onSaved();
    if (isNew) onClose();
  };

  const del = async () => {
    if (!sku || !confirm(`Delete ${sku.code}?`)) return;
    await fetch(`/api/skus/${sku.id}`, { method:"DELETE" });
    showFlash(`${sku.code} deleted`); onDeleted();
  };

  const addCat = () => {
    const c = newCat.trim(); if (!c) return;
    const cats = categories.includes(c) ? categories : [...categories, c].sort();
    setCategories(cats); try { localStorage.setItem("roci:categories", JSON.stringify(cats)); } catch {}
    setForm(p => ({ ...p, category: c })); setNewCat(""); setAddingCat(false);
  };

  const createSupplier = async () => {
    if (!newSupp.name.trim()) return;
    const res = await fetch("/api/suppliers", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...newSupp, locations:[], status:"active", notes:"" }) });
    const data = await res.json();
    if (res.ok) { await loadSuppliers(); setForm(p => ({ ...p, supplierId: data.id })); setAddingSupp(false); setNewSupp({ name:"", country:"", currency:"GBP" }); showFlash(`${data.name} created`); }
    else showFlash(data.error ?? "Failed", false);
  };

  // Stock for this SKU
  const skuStock = stock.filter(s => s.skuId === sku?.id);
  const totalQty = skuStock.reduce((s, e) => s + e.quantity, 0);
  const availQty = skuStock.reduce((s, e) => s + Math.max(0, e.quantity - e.reservedQty), 0);

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? "";

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-white shadow-xl border-l border-slate-200 flex flex-col z-30 animate-slide-right">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New SKU" : "SKU Detail"}</p>
          {!isNew && sku && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-bold text-slate-800 text-sm truncate">{sku.code} · {sku.name}</p>
            </div>
          )}
        </div>
        {/* Stock qty summary badge */}
        {!isNew && sku && skuStock.length > 0 && (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-slate-800 leading-none">{totalQty.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">{availQty} avail</p>
          </div>
        )}
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {flash && (
        <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {flash.msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Stock summary for existing SKUs */}
        {!isNew && sku && skuStock.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">In Stock</p>
            {skuStock.map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate flex-1">{e.location}</span>
                <span className="font-semibold text-slate-800 ml-2">{e.quantity.toLocaleString()}</span>
                <span className="text-slate-400 ml-1.5">({Math.max(0, e.quantity - e.reservedQty)} avail)</span>
              </div>
            ))}
          </div>
        )}

        {/* Identity */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Identity</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="SKU Code *"><input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())} className={inp} /></F>
            <F label="Status"><select value={form.status} onChange={e => f("status", e.target.value as SKU["status"])} className={inp}>{STATUS_OPTS.map(s => <option key={s}>{s}</option>)}</select></F>
          </div>
          <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
          <F label="Description"><textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>

          {/* Category */}
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
          {/* Subcategory below category */}
          <F label="Subcategory"><input value={form.subcategory} onChange={e => f("subcategory", e.target.value)} className={inp} /></F>
        </div>

        {/* Sourcing */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Sourcing</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</label>
              <button onClick={() => setAddingSupp(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{addingSupp ? "Cancel" : "+ New Supplier"}</button>
            </div>
            {addingSupp ? (
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-700">Quick-add supplier</p>
                <input value={newSupp.name} onChange={e => setNewSupp(p => ({ ...p, name:e.target.value }))} placeholder="Company name *" className={inp} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={newSupp.country} onChange={e => setNewSupp(p => ({ ...p, country:e.target.value }))} placeholder="Country" className={inp} />
                  <select value={newSupp.currency} onChange={e => setNewSupp(p => ({ ...p, currency:e.target.value }))} className={inp}>
                    {["GBP","EUR","USD","CAD","AUD","JPY","CNY"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={createSupplier} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">Create & Select</button>
              </div>
            ) : (
              <select value={form.supplierId} onChange={e => f("supplierId", e.target.value)} className={inp}>
                <option value="">— none —</option>
                {suppliers.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.name} {s.country ? `· ${s.country}` : ""}</option>)}
              </select>
            )}
          </div>
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
          {form.costPrice != null && form.salePrice != null && form.salePrice > 0 && (
            <p className="text-xs text-slate-400">Margin: <span className="font-semibold text-slate-700">{Math.round(((form.salePrice - form.costPrice) / form.salePrice) * 100)}%</span></p>
          )}
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

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3 bg-white">
        <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
          {saving ? "Saving…" : isNew ? "Create SKU" : "Save Changes"}
        </button>
        {!isNew && (
          <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
