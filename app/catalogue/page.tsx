"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SKU, Supplier } from "@/lib/store";

// ── UOM options (metric / imperial / count) ───────────────────────────────────
const UOM_GROUPS = [
  {
    label: "Count / Pack",
    units: ["each", "pair", "set", "pack", "box", "carton", "pallet", "roll", "sheet"],
  },
  {
    label: "Metric — Mass",
    units: ["mg", "g", "kg", "tonne"],
  },
  {
    label: "Metric — Volume",
    units: ["ml", "cl", "litre"],
  },
  {
    label: "Metric — Length / Area",
    units: ["mm", "cm", "m", "m²", "m³"],
  },
  {
    label: "Imperial — Mass",
    units: ["oz", "lb"],
  },
  {
    label: "Imperial — Volume",
    units: ["fl oz", "pint", "quart", "gallon"],
  },
  {
    label: "Imperial — Length",
    units: ["in", "ft", "yd"],
  },
];

const DEFAULT_CATEGORIES = [
  "Electronics", "Fashion", "Home & Garden", "Grocery",
  "Automotive", "Health & Beauty", "Tools", "Sports", "Toys", "Office", "Other",
];

const STATUS_OPTS: SKU["status"][] = ["active", "inactive", "discontinued"];

const STATUS_BADGE: Record<SKU["status"], string> = {
  active:       "bg-green-100 text-green-700",
  inactive:     "bg-amber-100 text-amber-700",
  discontinued: "bg-red-100 text-red-700",
};

const BLANK: Omit<SKU, "id" | "createdAt" | "updatedAt"> = {
  code: "", name: "", description: "", category: "", subcategory: "",
  supplierId: "", supplierCode: "", unitOfMeasure: "each",
  costPrice: null, salePrice: null, weight: null, dimensions: "",
  barcode: "", minStockLevel: null, reorderPoint: null, leadTimeDays: null,
  status: "active", notes: "",
};

const BLANK_SUPPLIER = { name: "", contactName: "", email: "", phone: "", address: "", country: "", leadTimeDays: 0, paymentTerms: "", currency: "GBP", status: "active" as Supplier["status"], notes: "" };

// ── helpers ───────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${props.className ?? ""}`} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-1.5 border-b border-slate-100">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export default function SKUEditor() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<SKU | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  // category add state
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const catInputRef = useRef<HTMLInputElement>(null);

  // quick-add supplier state
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(BLANK_SUPPLIER);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // load categories from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("roci:categories");
      if (stored) setCategories(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const persistCategories = (cats: string[]) => {
    setCategories(cats);
    try { localStorage.setItem("roci:categories", JSON.stringify(cats)); } catch { /* ignore */ }
  };

  const addCategory = () => {
    const cat = newCat.trim();
    if (!cat) return;
    if (!categories.includes(cat)) persistCategories([...categories, cat].sort());
    setNewCat(""); setAddingCat(false);
    // pre-select the new category in the form
    setForm(p => ({ ...p, category: cat }));
  };

  const removeCategory = (cat: string) => {
    persistCategories(categories.filter(c => c !== cat));
  };

  const reload = useCallback(async () => {
    const [s, sup] = await Promise.all([
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
    ]);
    setSkus(s); setSuppliers(sup);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // focus category input when it appears
  useEffect(() => { if (addingCat) catInputRef.current?.focus(); }, [addingCat]);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500);
  };

  const openNew = () => { setIsNew(true); setSelected(null); setForm(BLANK); };
  const openEdit = (sku: SKU) => {
    setIsNew(false); setSelected(sku);
    setForm({ code: sku.code, name: sku.name, description: sku.description, category: sku.category, subcategory: sku.subcategory, supplierId: sku.supplierId, supplierCode: sku.supplierCode, unitOfMeasure: sku.unitOfMeasure, costPrice: sku.costPrice, salePrice: sku.salePrice, weight: sku.weight, dimensions: sku.dimensions, barcode: sku.barcode, minStockLevel: sku.minStockLevel, reorderPoint: sku.reorderPoint, leadTimeDays: sku.leadTimeDays, status: sku.status, notes: sku.notes });
  };
  const closePanel = () => { setSelected(null); setIsNew(false); setAddingSupplier(false); };

  const f = (k: keyof typeof BLANK, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const num = (v: string) => v === "" ? null : Number(v);

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { showFlash("Code and name are required", false); return; }
    setSaving(true);
    try {
      const res = isNew
        ? await fetch("/api/skus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await fetch(`/api/skus/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { showFlash(data.error ?? "Save failed", false); return; }
      showFlash(isNew ? `${data.code} created` : `${data.code} saved`);
      await reload();
      if (isNew) { openEdit(data); setIsNew(false); }
    } finally { setSaving(false); }
  };

  const deleteSKU = async () => {
    if (!selected || !confirm(`Delete ${selected.code}? This cannot be undone.`)) return;
    await fetch(`/api/skus/${selected.id}`, { method: "DELETE" });
    showFlash(`${selected.code} deleted`);
    closePanel(); await reload();
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) { showFlash("Supplier name is required", false); return; }
    setSavingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplierForm) });
      const data = await res.json();
      if (!res.ok) { showFlash(data.error ?? "Failed to create supplier", false); return; }
      showFlash(`Supplier "${data.name}" created`);
      await reload();
      setForm(p => ({ ...p, supplierId: data.id }));
      setAddingSupplier(false);
      setSupplierForm(BLANK_SUPPLIER);
    } finally { setSavingSupplier(false); }
  };

  // ── filter ───────────────────────────────────────────────────────────────
  const visible = skus.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.code.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
    if (filterCat && s.category !== filterCat) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? "—";
  const panelOpen = selected !== null || isNew;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* ── table pane ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800">SKU Editor</h2>
            <p className="text-xs text-slate-400">{skus.length} SKUs · {suppliers.length} suppliers</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code or name…"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={openNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0">
            + New SKU
          </button>
        </div>

        {flash && (
          <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm animate-fade-in ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {flash.msg}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">UoM</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Sale</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {skus.length === 0 ? 'No SKUs yet — click "+ New SKU" to start' : "No matches"}
                </td></tr>
              )}
              {visible.map((s) => (
                <tr key={s.id} onClick={() => openEdit(s)}
                  className={`cursor-pointer transition-colors hover:bg-blue-50 ${selected?.id === s.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800 text-xs">{s.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-700 max-w-[200px] truncate">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{supplierName(s.supplierId)}</td>
                  <td className="px-4 py-3 text-slate-500">{s.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{s.costPrice != null ? `£${s.costPrice.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{s.salePrice != null ? `£${s.salePrice.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── edit panel ── */}
      {panelOpen && (
        <div className="w-[460px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New SKU" : "Edit SKU"}</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : `${form.code} · ${form.name}`}</p>
            </div>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {/* Identity */}
            <Section title="Identity">
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU Code *"><Input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())} placeholder="e.g. ELEC-TV-001" /></Field>
                <Field label="Status"><Select value={form.status} onChange={e => f("status", e.target.value as SKU["status"])}>{STATUS_OPTS.map(s => <option key={s}>{s}</option>)}</Select></Field>
              </div>
              <Field label="Name *"><Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Product name" /></Field>
              <Field label="Description">
                <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} placeholder="Brief description…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </Field>
              {/* Category with inline add */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                    <button onClick={() => setAddingCat(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {addingCat ? "Cancel" : "+ Add"}
                    </button>
                  </div>
                  {addingCat ? (
                    <div className="flex gap-1">
                      <input
                        ref={catInputRef}
                        value={newCat}
                        onChange={e => setNewCat(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAddingCat(false); }}
                        placeholder="New category…"
                        className="flex-1 border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button onClick={addCategory} className="bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Add</button>
                    </div>
                  ) : (
                    <Select value={form.category} onChange={e => f("category", e.target.value)}>
                      <option value="">— select —</option>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </Select>
                  )}
                </div>
                <Field label="Subcategory"><Input value={form.subcategory} onChange={e => f("subcategory", e.target.value)} placeholder="Optional" /></Field>
              </div>
            </Section>

            {/* Sourcing */}
            <Section title="Sourcing">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</label>
                  <button onClick={() => setAddingSupplier(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {addingSupplier ? "Cancel" : "+ New Supplier"}
                  </button>
                </div>
                {addingSupplier ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Quick-add Supplier</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Name *</label>
                        <input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Supplier name"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Country</label>
                        <input value={supplierForm.country} onChange={e => setSupplierForm(p => ({ ...p, country: e.target.value }))}
                          placeholder="e.g. UK"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Contact</label>
                        <input value={supplierForm.contactName} onChange={e => setSupplierForm(p => ({ ...p, contactName: e.target.value }))}
                          placeholder="Name"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Currency</label>
                        <select value={supplierForm.currency} onChange={e => setSupplierForm(p => ({ ...p, currency: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {["GBP","EUR","USD","CAD","AUD"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveSupplier} disabled={savingSupplier}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        {savingSupplier ? "Creating…" : "Create Supplier"}
                      </button>
                      <button onClick={() => setAddingSupplier(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <Select value={form.supplierId} onChange={e => f("supplierId", e.target.value)}>
                    <option value="">— none —</option>
                    {suppliers.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Supplier Code"><Input value={form.supplierCode} onChange={e => f("supplierCode", e.target.value)} placeholder="Their ref" /></Field>
                <Field label="Lead Time (days)"><Input type="number" min={0} value={form.leadTimeDays ?? ""} onChange={e => f("leadTimeDays", num(e.target.value))} placeholder="0" /></Field>
              </div>
            </Section>

            {/* Pricing & Unit */}
            <Section title="Pricing & Unit">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Unit of Measure">
                  <select value={form.unitOfMeasure} onChange={e => f("unitOfMeasure", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {UOM_GROUPS.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.units.map(u => <option key={u} value={u}>{u}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Cost Price (£)"><Input type="number" step="0.01" min={0} value={form.costPrice ?? ""} onChange={e => f("costPrice", num(e.target.value))} placeholder="0.00" /></Field>
                <Field label="Sale Price (£)"><Input type="number" step="0.01" min={0} value={form.salePrice ?? ""} onChange={e => f("salePrice", num(e.target.value))} placeholder="0.00" /></Field>
              </div>
            </Section>

            {/* Physical */}
            <Section title="Physical">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)"><Input type="number" step="0.001" min={0} value={form.weight ?? ""} onChange={e => f("weight", num(e.target.value))} placeholder="0.000" /></Field>
                <Field label="Dimensions"><Input value={form.dimensions} onChange={e => f("dimensions", e.target.value)} placeholder="L×W×H cm" /></Field>
              </div>
              <Field label="Barcode / EAN"><Input value={form.barcode} onChange={e => f("barcode", e.target.value)} placeholder="Scan or enter" /></Field>
            </Section>

            {/* Inventory */}
            <Section title="Inventory Rules">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Stock Level"><Input type="number" min={0} value={form.minStockLevel ?? ""} onChange={e => f("minStockLevel", num(e.target.value))} placeholder="0" /></Field>
                <Field label="Reorder Point"><Input type="number" min={0} value={form.reorderPoint ?? ""} onChange={e => f("reorderPoint", num(e.target.value))} placeholder="0" /></Field>
              </div>
            </Section>

            {/* Notes */}
            <Section title="Notes">
              <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={3} placeholder="Any additional notes…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </Section>
          </div>

          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
              {saving ? "Saving…" : isNew ? "Create SKU" : "Save changes"}
            </button>
            {!isNew && (
              <button onClick={deleteSKU} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors border border-red-200">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
