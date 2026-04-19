"use client";

import { useEffect, useState } from "react";
import type { Supplier, SKU, SupplierLocation, LocationType } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}

const LOC_TYPES: { value: LocationType; label: string }[] = [
  { value: "hq",        label: "Headquarters" },
  { value: "depot",     label: "Depot" },
  { value: "warehouse", label: "Warehouse" },
  { value: "store",     label: "Store / Branch" },
  { value: "port",      label: "Port / Terminal" },
  { value: "other",     label: "Other" },
];

const LOC_TYPE_CLS: Record<LocationType, string> = {
  hq:        "bg-blue-100 text-blue-700",
  depot:     "bg-indigo-100 text-indigo-700",
  warehouse: "bg-amber-100 text-amber-700",
  store:     "bg-green-100 text-green-700",
  port:      "bg-cyan-100 text-cyan-700",
  other:     "bg-slate-100 text-slate-600",
};

const BLANK: Omit<Supplier, "id" | "createdAt" | "updatedAt"> = {
  name: "", contactName: "", email: "", phone: "", address: "", country: "",
  locations: [], leadTimeDays: 0, paymentTerms: "", currency: "GBP", status: "active", notes: "",
};

const BLANK_LOC = { type: "hq" as LocationType, label: "", address: "", city: "", country: "", postcode: "", phone: "" };

interface Props {
  supplier: Supplier | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SupplierEditPanel({ supplier, isNew, onClose, onSaved, onDeleted }: Props) {
  const [skus,       setSkus]       = useState<SKU[]>([]);
  const [form,       setForm]       = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [addingLoc,  setAddingLoc]  = useState(false);
  const [locForm,    setLocForm]    = useState(BLANK_LOC);

  // Populate form when supplier changes
  useEffect(() => {
    if (isNew || !supplier) {
      setForm(BLANK);
    } else {
      setForm({
        name: supplier.name, contactName: supplier.contactName,
        email: supplier.email, phone: supplier.phone,
        address: supplier.address, country: supplier.country,
        locations: supplier.locations ?? [],
        leadTimeDays: supplier.leadTimeDays, paymentTerms: supplier.paymentTerms,
        currency: supplier.currency, status: supplier.status, notes: supplier.notes,
      });
    }
    setAddingLoc(false);
    setLocForm(BLANK_LOC);
  }, [supplier, isNew]);

  useEffect(() => {
    fetch("/api/skus").then(r => r.json()).then(setSkus);
  }, []);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch(`/api/suppliers/${supplier!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false);
    onSaved();
  };

  const del = async () => {
    if (!supplier || !confirm(`Delete ${supplier.name}?`)) return;
    await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
    onDeleted();
  };

  const addLocation = () => {
    if (!locForm.label.trim() || !locForm.address.trim()) { showFlash("Label and address required", false); return; }
    const newLoc: SupplierLocation = { ...locForm, id: `loc_${Date.now()}`, isPrimary: form.locations.length === 0 };
    setForm(p => ({ ...p, locations: [...p.locations, newLoc] }));
    setLocForm(BLANK_LOC);
    setAddingLoc(false);
  };

  const removeLocation = (id: string) => setForm(p => ({ ...p, locations: p.locations.filter(l => l.id !== id) }));
  const setPrimary     = (id: string) => setForm(p => ({ ...p, locations: p.locations.map(l => ({ ...l, isPrimary: l.id === id })) }));

  const linkedSkus = skus.filter(k => supplier && k.supplierId === supplier.id);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-white shadow-xl border-l border-slate-200 flex flex-col z-30 animate-slide-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isNew ? "New Supplier" : "Edit Supplier"}
          </p>
          <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : form.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {flash && (
        <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {flash.msg}
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
        <F label="Contact Name"><input value={form.contactName} onChange={e => f("contactName", e.target.value)} className={inp} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Email"><input type="email" value={form.email} onChange={e => f("email", e.target.value)} className={inp} /></F>
          <F label="Phone"><input value={form.phone} onChange={e => f("phone", e.target.value)} className={inp} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Currency">
            <select value={form.currency} onChange={e => f("currency", e.target.value)} className={inp}>
              {["GBP", "EUR", "USD", "CAD", "AUD", "JPY", "CNY"].map(c => <option key={c}>{c}</option>)}
            </select>
          </F>
          <F label="Lead Time (days)">
            <input type="number" min={0} value={form.leadTimeDays} onChange={e => f("leadTimeDays", Number(e.target.value))} className={inp} />
          </F>
        </div>
        <F label="Payment Terms">
          <input value={form.paymentTerms} onChange={e => f("paymentTerms", e.target.value)} placeholder="Net 30, COD, etc." className={inp} />
        </F>
        <F label="Status">
          <select value={form.status} onChange={e => f("status", e.target.value as Supplier["status"])} className={inp}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </F>
        <F label="Notes">
          <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </F>

        {/* Locations */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Addresses & Locations</p>
            <button onClick={() => { setLocForm(BLANK_LOC); setAddingLoc(v => !v); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
              {addingLoc ? "Cancel" : "+ Add"}
            </button>
          </div>

          {addingLoc && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 space-y-2">
              <F label="Type">
                <select value={locForm.type} onChange={e => setLocForm(p => ({ ...p, type: e.target.value as LocationType }))} className={inp}>
                  {LOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </F>
              <F label="Label *">
                <input value={locForm.label} onChange={e => setLocForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. London Warehouse" className={inp} />
              </F>
              <F label="Street Address *">
                <input value={locForm.address} onChange={e => setLocForm(p => ({ ...p, address: e.target.value }))} className={inp} />
              </F>
              <div className="grid grid-cols-2 gap-2">
                <F label="City"><input value={locForm.city} onChange={e => setLocForm(p => ({ ...p, city: e.target.value }))} className={inp} /></F>
                <F label="Postcode"><input value={locForm.postcode} onChange={e => setLocForm(p => ({ ...p, postcode: e.target.value }))} className={inp} /></F>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Country"><input value={locForm.country} onChange={e => setLocForm(p => ({ ...p, country: e.target.value }))} className={inp} /></F>
                <F label="Phone"><input value={locForm.phone} onChange={e => setLocForm(p => ({ ...p, phone: e.target.value }))} className={inp} /></F>
              </div>
              <button onClick={addLocation} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">
                Add Location
              </button>
            </div>
          )}

          {form.locations.length === 0 && !addingLoc && (
            <p className="text-xs text-slate-400 py-1">No locations yet</p>
          )}
          <div className="space-y-2">
            {form.locations.map(loc => (
              <div key={loc.id} className={`rounded-xl border p-3 ${loc.isPrimary ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LOC_TYPE_CLS[loc.type]}`}>
                      {LOC_TYPES.find(t => t.value === loc.type)?.label ?? loc.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{loc.label}</span>
                    {loc.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">Primary</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!loc.isPrimary && (
                      <button onClick={() => setPrimary(loc.id)} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Set Primary</button>
                    )}
                    <button onClick={() => removeLocation(loc.id)} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
                  </div>
                </div>
                <p className="text-xs text-slate-600">{loc.address}</p>
                <p className="text-xs text-slate-400">{[loc.city, loc.postcode, loc.country].filter(Boolean).join(", ")}</p>
                {loc.phone && <p className="text-xs text-slate-400">{loc.phone}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Linked SKUs */}
        {!isNew && linkedSkus.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Linked SKUs ({linkedSkus.length})</p>
            <div className="space-y-1">
              {linkedSkus.slice(0, 10).map(k => (
                <div key={k.id} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1.5 text-xs">
                  <span className="font-mono text-slate-700">{k.code}</span>
                  <span className="flex-1 text-slate-400 truncate">{k.name}</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>{k.status}</span>
                </div>
              ))}
              {linkedSkus.length > 10 && <p className="text-[10px] text-slate-400 px-3">+{linkedSkus.length - 10} more</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3">
        <button onClick={save} disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg">
          {saving ? "Saving…" : isNew ? "Create Supplier" : "Save Changes"}
        </button>
        {!isNew && (
          <button onClick={del}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
