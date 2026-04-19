"use client";

import { useCallback, useEffect, useState } from "react";
import type { Supplier, SKU, TransportJob } from "@/lib/store";

const BLANK: Omit<Supplier, "id" | "createdAt" | "updatedAt"> = {
  name: "", contactName: "", email: "", phone: "", address: "", country: "",
  locations: [], leadTimeDays: 0, paymentTerms: "", currency: "GBP", status: "active", notes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const STATUS_DOT: Record<TransportJob["status"], string> = {
  pending: "bg-amber-400", in_transit: "bg-blue-500", delivered: "bg-green-500", cancelled: "bg-slate-400",
};
const STATUS_LABEL: Record<TransportJob["status"], string> = {
  pending: "Pending", in_transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [transport, setTransport] = useState<TransportJob[]>([]);
  const [selected,  setSelected]  = useState<Supplier | null>(null);
  const [isNew,     setIsNew]     = useState(false);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [flash,     setFlash]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,    setSearch]    = useState("");
  const [tab,       setTab]       = useState<"active" | "history">("active");

  const reload = useCallback(async () => {
    const [s, sk, tr] = await Promise.all([
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]);
    setSuppliers(s); setSkus(sk); setTransport(tr);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setIsNew(true); setSelected(null); setForm(BLANK); };
  const openEdit = (s: Supplier) => {
    setIsNew(false); setSelected(s);
    setForm({ name: s.name, contactName: s.contactName, email: s.email, phone: s.phone,
      address: s.address, country: s.country, locations: s.locations ?? [],
      leadTimeDays: s.leadTimeDays, paymentTerms: s.paymentTerms,
      currency: s.currency, status: s.status, notes: s.notes });
  };

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name is required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch(`/api/suppliers/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false); await reload();
    if (isNew) { setIsNew(false); setSelected(data); }
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/suppliers/${selected.id}`, { method: "DELETE" });
    showFlash(`${selected.name} deleted`);
    setSelected(null); setIsNew(false); await reload();
  };

  const skuCount = (id: string) => skus.filter(s => s.supplierId === id).length;
  const visible = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.country.toLowerCase().includes(search.toLowerCase())
  );
  const panelOpen = selected !== null || isNew;

  // History: transport jobs involving each supplier's SKUs
  const buildSupplierHistory = () => {
    return transport
      .flatMap(job =>
        job.items
          .map(item => {
            const sku = skus.find(k => k.id === item.skuId);
            if (!sku) return null;
            const sup = suppliers.find(s => s.id === sku.supplierId);
            if (!sup) return null;
            return { job, sku, supplier: sup };
          })
          .filter(Boolean)
      )
      .sort((a, b) => (b!.job.scheduledDate ?? "").localeCompare(a!.job.scheduledDate ?? "")) as
      Array<{ job: TransportJob; sku: SKU; supplier: Supplier }>;
  };

  const history = buildSupplierHistory();

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex-wrap">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Suppliers</h2>
            <p className="text-xs text-slate-400">{suppliers.length} total</p>
          </div>
          {/* tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(["active", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "active" ? "Suppliers" : "History"}
              </button>
            ))}
          </div>
          {tab === "active" && <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
            <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">+ New Supplier</button>
          </>}
        </div>

        {flash && <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

        {tab === "active" ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Lead Time</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">SKUs</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    {suppliers.length === 0 ? "No suppliers yet" : "No matches"}
                  </td></tr>
                )}
                {visible.map(s => (
                  <tr key={s.id} onClick={() => openEdit(s)}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === s.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.contactName || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{s.country || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{s.leadTimeDays ? `${s.leadTimeDays}d` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{s.currency}</td>
                    <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">{skuCount(s.id)}</span></td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── History tab ── */
          <div className="flex-1 overflow-auto p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Shipment Activity by Supplier</p>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">No shipment history yet</p>
            ) : (
              <div className="space-y-2">
                {history.map(({ job, sku, supplier }, i) => (
                  <div key={`${job.id}-${sku.id}-${i}`}
                    className="flex items-start gap-4 bg-white rounded-xl border border-slate-100 px-5 py-3 shadow-sm">
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[job.status]}`} />
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-700">{job.ref}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          job.status === "delivered" ? "bg-green-100 text-green-700" :
                          job.status === "in_transit" ? "bg-blue-100 text-blue-700" :
                          job.status === "pending" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>{STATUS_LABEL[job.status]}</span>
                        <span className="text-xs text-slate-500">{job.origin} → {job.destination}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        <span className="font-medium">{supplier.name}</span>
                        {" · "}
                        <span className="font-mono">{sku.code}</span> — {sku.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {job.scheduledDate && <p className="text-xs text-slate-400">{job.scheduledDate}</p>}
                      {job.driver && <p className="text-xs text-slate-400">{job.driver}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Supplier SKU breakdown */}
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-8 mb-4">SKUs by Supplier</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {suppliers.filter(s => skuCount(s.id) > 0).map(s => {
                const linked = skus.filter(k => k.supplierId === s.id);
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.country} · {s.currency} · {s.leadTimeDays}d lead time</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                    </div>
                    <div className="space-y-1">
                      {linked.map(k => (
                        <div key={k.id} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-600">{k.code}</span>
                          <span className="text-slate-400 truncate mx-2">{k.name}</span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"}`}>{k.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {panelOpen && tab === "active" && (
        <div className="w-[420px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New Supplier" : "Edit Supplier"}</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : form.name}</p>
            </div>
            <button onClick={() => { setSelected(null); setIsNew(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Field label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Supplier name" className={inp} /></Field>
            <Field label="Contact Name"><input value={form.contactName} onChange={e => f("contactName", e.target.value)} placeholder="Account manager" className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><input type="email" value={form.email} onChange={e => f("email", e.target.value)} className={inp} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={e => f("phone", e.target.value)} className={inp} /></Field>
            </div>
            <Field label="Address"><input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Street address" className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country"><input value={form.country} onChange={e => f("country", e.target.value)} className={inp} /></Field>
              <Field label="Currency"><select value={form.currency} onChange={e => f("currency", e.target.value)} className={inp}>{["GBP","EUR","USD","CAD","AUD"].map(c => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead Time (days)"><input type="number" min={0} value={form.leadTimeDays} onChange={e => f("leadTimeDays", Number(e.target.value))} className={inp} /></Field>
              <Field label="Payment Terms"><input value={form.paymentTerms} onChange={e => f("paymentTerms", e.target.value)} placeholder="e.g. Net 30" className={inp} /></Field>
            </div>
            <Field label="Status"><select value={form.status} onChange={e => f("status", e.target.value as Supplier["status"])} className={inp}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></Field>

            {/* linked SKUs when editing */}
            {!isNew && selected && (() => {
              const linked = skus.filter(k => k.supplierId === selected.id);
              if (linked.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Linked SKUs</p>
                  <div className="space-y-1">
                    {linked.map(k => (
                      <div key={k.id} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5">
                        <span className="text-xs font-mono text-slate-700">{k.code}</span>
                        <span className="text-xs text-slate-500 truncate mx-2">{k.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>{k.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">{saving ? "Saving…" : isNew ? "Create Supplier" : "Save changes"}</button>
            {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
}
