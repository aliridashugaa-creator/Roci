"use client";

import { useCallback, useEffect, useState } from "react";
import type { Supplier, SKU, TransportJob, SupplierLocation, LocationType } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const BLANK: Omit<Supplier, "id" | "createdAt" | "updatedAt"> = {
  name: "", contactName: "", email: "", phone: "", address: "", country: "",
  locations: [], leadTimeDays: 0, paymentTerms: "", currency: "GBP", status: "active", notes: "",
};

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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}

const BLANK_LOC = { type: "hq" as LocationType, label: "", address: "", city: "", country: "", postcode: "", phone: "" };

// ── Back arrow ─────────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
  );
}

// ── Flash banner ───────────────────────────────────────────────────────────────
function Flash({ flash }: { flash: { msg: string; ok: boolean } | null }) {
  if (!flash) return null;
  return (
    <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {flash.msg}
    </div>
  );
}

export default function SuppliersPanel({ onClose }: { onClose: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [transport, setTransport] = useState<TransportJob[]>([]);
  const [search,    setSearch]    = useState("");
  const [listTab,   setListTab]   = useState<"active" | "history">("active");

  // Edit overlay state
  const [editOpen,  setEditOpen]  = useState(false);
  const [selected,  setSelected]  = useState<Supplier | null>(null);
  const [isNew,     setIsNew]     = useState(false);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [editFlash, setEditFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  // Add location overlay state
  const [locOpen,  setLocOpen]  = useState(false);
  const [locForm,  setLocForm]  = useState(BLANK_LOC);
  const [locFlash, setLocFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const reload = useCallback(async () => {
    const [s, sk, tr] = await Promise.all([
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]);
    setSuppliers(s); setSkus(sk); setTransport(tr);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showEdit = (msg: string, ok = true) => { setEditFlash({ msg, ok }); setTimeout(() => setEditFlash(null), 3000); };
  const showLoc  = (msg: string, ok = true) => { setLocFlash({ msg, ok });  setTimeout(() => setLocFlash(null),  3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setIsNew(true); setSelected(null); setForm(BLANK); setEditOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setIsNew(false); setSelected(s);
    setForm({
      name: s.name, contactName: s.contactName, email: s.email, phone: s.phone,
      address: s.address, country: s.country, locations: s.locations ?? [],
      leadTimeDays: s.leadTimeDays, paymentTerms: s.paymentTerms,
      currency: s.currency, status: s.status, notes: s.notes,
    });
    setEditOpen(true);
  };
  const closeEdit = () => { setEditOpen(false); setLocOpen(false); };

  const save = async () => {
    if (!form.name.trim()) { showEdit("Name required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch(`/api/suppliers/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showEdit(data.error ?? "Save failed", false); setSaving(false); return; }
    showEdit(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false); await reload();
    if (isNew) { setIsNew(false); setSelected(data); setForm(p => ({ ...p, locations: data.locations ?? [] })); }
    else setSelected(data);
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/suppliers/${selected.id}`, { method: "DELETE" });
    showEdit(`${selected.name} deleted`); closeEdit(); await reload();
  };

  const addLocation = () => {
    if (!locForm.label.trim() || !locForm.address.trim()) { showLoc("Label and address required", false); return; }
    const newLoc: SupplierLocation = { ...locForm, id: `loc_${Date.now()}`, isPrimary: form.locations.length === 0 };
    setForm(p => ({ ...p, locations: [...p.locations, newLoc] }));
    setLocForm(BLANK_LOC); setLocOpen(false);
  };

  const removeLocation = (id: string) => setForm(p => ({ ...p, locations: p.locations.filter(l => l.id !== id) }));
  const setPrimary     = (id: string) => setForm(p => ({ ...p, locations: p.locations.map(l => ({ ...l, isPrimary: l.id === id })) }));

  const skuCount = (id: string) => skus.filter(s => s.supplierId === id).length;

  // Grouped for list
  const grouped = (() => {
    const hq         = suppliers.filter(s => s.locations?.some(l => l.type === "hq"        && l.isPrimary) || !s.locations?.length);
    const depots     = suppliers.filter(s => s.locations?.some(l => l.type === "depot"     && l.isPrimary) && !hq.includes(s));
    const warehouses = suppliers.filter(s => s.locations?.some(l => l.type === "warehouse" && l.isPrimary) && !hq.includes(s) && !depots.includes(s));
    const other      = suppliers.filter(s => !hq.includes(s) && !depots.includes(s) && !warehouses.includes(s));
    return { hq, depots, warehouses, other };
  })();

  const visible = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.country.toLowerCase().includes(search.toLowerCase())
  );

  const history = transport.flatMap(job =>
    job.items.flatMap(item => {
      const sku = skus.find(k => k.id === item.skuId);
      if (!sku) return [];
      const sup = suppliers.find(s => s.id === sku.supplierId);
      if (!sup) return [];
      return [{ job, sku, supplier: sup }];
    })
  ).sort((a, b) => (b.job.scheduledDate ?? "").localeCompare(a.job.scheduledDate ?? ""));

  const DOT: Record<TransportJob["status"], string> = { pending: "bg-amber-400", in_transit: "bg-blue-500", delivered: "bg-green-500", cancelled: "bg-slate-400" };
  const LBL: Record<TransportJob["status"], string> = { pending: "Pending", in_transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled" };

  const SupplierRow = ({ s }: { s: Supplier }) => (
    <button onClick={() => openEdit(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
        </div>
        <p className="text-xs text-slate-400 truncate">{s.country || "—"} · {s.currency} · {s.leadTimeDays}d lead</p>
        {s.locations && s.locations.length > 0 && (
          <p className="text-[10px] text-slate-400 truncate">
            {s.locations.filter(l => l.isPrimary).map(l => l.city || l.address).join(", ") || s.locations[0].city || s.locations[0].address}
          </p>
        )}
      </div>
      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium shrink-0">{skuCount(s.id)} SKUs</span>
      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  return (
    <div className="relative flex flex-col h-full overflow-hidden">

      {/* ── BASE: Supplier list ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(["active", "history"] as const).map(t => (
              <button key={t} onClick={() => setListTab(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${listTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "active" ? "Suppliers" : "History"}
              </button>
            ))}
          </div>
          {listTab === "active" && (
            <button onClick={openNew} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">+ New</button>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {listTab === "active" && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…"
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {listTab === "active" ? (
        <>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-slate-400">{suppliers.length === 0 ? "No suppliers yet" : "No matches"}</p>
            )}
            {!search ? (
              <>
                {grouped.hq.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Headquarters</p>
                    <div className="divide-y divide-slate-100">{grouped.hq.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.depots.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Depots</p>
                    <div className="divide-y divide-slate-100">{grouped.depots.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.warehouses.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouses</p>
                    <div className="divide-y divide-slate-100">{grouped.warehouses.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
                {grouped.other.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Other</p>
                    <div className="divide-y divide-slate-100">{grouped.other.map(s => <SupplierRow key={s.id} s={s} />)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="divide-y divide-slate-100">{visible.map(s => <SupplierRow key={s.id} s={s} />)}</div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">
            {suppliers.length} suppliers · {skus.length} linked SKUs
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Shipment Activity by Supplier</p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400">No activity yet</p>
          ) : history.map(({ job, sku, supplier }, i) => (
            <div key={`${job.id}-${i}`} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${DOT[job.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-mono font-bold text-slate-700">{job.ref}</span>
                  <span className="text-xs text-slate-500">{job.origin} → {job.destination}</span>
                </div>
                <p className="text-xs text-slate-500"><span className="font-medium">{supplier.name}</span> · <span className="font-mono">{sku.code}</span></p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium block mb-0.5 ${
                  job.status === "delivered"  ? "bg-green-100 text-green-700" :
                  job.status === "in_transit" ? "bg-blue-100 text-blue-700"  :
                  job.status === "pending"    ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-500"}`}>
                  {LBL[job.status]}
                </span>
                {job.scheduledDate && <span className="text-[10px] text-slate-400">{job.scheduledDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RIGHT OVERLAY 1: New / Edit Supplier ── */}
      {editOpen && (
        <div className="absolute inset-0 flex flex-col bg-white animate-panel-right z-10">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
            <BackBtn onClick={closeEdit} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {isNew ? "New Supplier" : "Edit Supplier"}
              </p>
              {!isNew && <p className="text-sm font-bold text-slate-800 truncate">{form.name}</p>}
            </div>
          </div>

          <Flash flash={editFlash} />

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
            <div>
              <div className="flex items-center justify-between mb-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Addresses & Locations</p>
                <button onClick={() => { setLocForm(BLANK_LOC); setLocOpen(true); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold">+ Add</button>
              </div>

              {form.locations.length === 0 && (
                <p className="text-xs text-slate-400 py-1">No locations yet</p>
              )}

              <div className="space-y-2">
                {form.locations.map(loc => (
                  <div key={loc.id} className={`rounded-xl border p-3 ${loc.isPrimary ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LOC_TYPE_CLS[loc.type]}`}>
                          {LOC_TYPES.find(t => t.value === loc.type)?.label ?? loc.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{loc.label}</span>
                        {loc.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">Primary</span>}
                      </div>
                      <div className="flex items-center gap-2">
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
            {!isNew && selected && (() => {
              const linked = skus.filter(k => k.supplierId === selected.id);
              if (!linked.length) return null;
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 pt-1">Linked SKUs ({linked.length})</p>
                  <div className="space-y-1">
                    {linked.slice(0, 10).map(k => (
                      <div key={k.id} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1.5 text-xs">
                        <span className="font-mono text-slate-700">{k.code}</span>
                        <span className="flex-1 text-slate-400 truncate">{k.name}</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>{k.status}</span>
                      </div>
                    ))}
                    {linked.length > 10 && <p className="text-[10px] text-slate-400 px-3">+{linked.length - 10} more</p>}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 flex gap-3 bg-white">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg">
              {saving ? "Saving…" : isNew ? "Create Supplier" : "Save Changes"}
            </button>
            {!isNew && (
              <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200">
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RIGHT OVERLAY 2: Add Location ── */}
      {locOpen && (
        <div className="absolute inset-0 flex flex-col bg-white animate-panel-right z-20">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
            <BackBtn onClick={() => setLocOpen(false)} />
            <div className="flex-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Add Location</p>
              <p className="text-sm font-bold text-slate-800">{form.name || "New Supplier"}</p>
            </div>
          </div>

          <Flash flash={locFlash} />

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <F label="Location Type">
              <select value={locForm.type} onChange={e => setLocForm(p => ({ ...p, type: e.target.value as LocationType }))} className={inp}>
                {LOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
            <F label="Label *">
              <input value={locForm.label} onChange={e => setLocForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g. London Warehouse" className={inp} />
            </F>
            <F label="Street Address *">
              <input value={locForm.address} onChange={e => setLocForm(p => ({ ...p, address: e.target.value }))} className={inp} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="City">
                <input value={locForm.city} onChange={e => setLocForm(p => ({ ...p, city: e.target.value }))} className={inp} />
              </F>
              <F label="Postcode">
                <input value={locForm.postcode} onChange={e => setLocForm(p => ({ ...p, postcode: e.target.value }))} className={inp} />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Country">
                <input value={locForm.country} onChange={e => setLocForm(p => ({ ...p, country: e.target.value }))} className={inp} />
              </F>
              <F label="Phone">
                <input value={locForm.phone} onChange={e => setLocForm(p => ({ ...p, phone: e.target.value }))} className={inp} />
              </F>
            </div>
            {form.locations.length === 0 && (
              <p className="text-[10px] text-blue-500 bg-blue-50 rounded px-3 py-2">This will be set as the primary location.</p>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 bg-white">
            <button onClick={addLocation} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-lg">
              Add Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
