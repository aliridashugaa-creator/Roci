"use client";

import { useCallback, useEffect, useState } from "react";
import type { Supplier, SKU, TransportJob } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const BLANK: Omit<Supplier, "id"|"createdAt"|"updatedAt"> = {
  name:"", contactName:"", email:"", phone:"", address:"", country:"",
  leadTimeDays:0, paymentTerms:"", currency:"GBP", status:"active", notes:"",
};

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}

export default function SuppliersPanel({ onClose }: { onClose: () => void }) {
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [skus,       setSkus]       = useState<SKU[]>([]);
  const [transport,  setTransport]  = useState<TransportJob[]>([]);
  const [search,     setSearch]     = useState("");
  const [view,       setView]       = useState<"list"|"edit">("list");
  const [tab,        setTab]        = useState<"active"|"history">("active");
  const [selected,   setSelected]   = useState<Supplier | null>(null);
  const [isNew,      setIsNew]      = useState(false);
  const [form,       setForm]       = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);

  const reload = useCallback(async () => {
    const [s, sk, tr] = await Promise.all([
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
    ]);
    setSuppliers(s); setSkus(sk); setTransport(tr);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew  = () => { setIsNew(true); setSelected(null); setForm(BLANK); setView("edit"); };
  const openEdit = (s: Supplier) => {
    setIsNew(false); setSelected(s);
    setForm({ name:s.name, contactName:s.contactName, email:s.email, phone:s.phone, address:s.address, country:s.country, leadTimeDays:s.leadTimeDays, paymentTerms:s.paymentTerms, currency:s.currency, status:s.status, notes:s.notes });
    setView("edit");
  };

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name required", false); return; }
    setSaving(true);
    const res = isNew
      ? await fetch("/api/suppliers", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      : await fetch(`/api/suppliers/${selected!.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false); await reload(); if (isNew) { setIsNew(false); setSelected(data); }
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/suppliers/${selected.id}`, { method:"DELETE" });
    showFlash(`${selected.name} deleted`); setView("list"); await reload();
  };

  const skuCount = (id: string) => skus.filter(s => s.supplierId === id).length;
  const visible = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.country.toLowerCase().includes(search.toLowerCase()));

  // History: transport jobs involving supplier's SKUs
  const history = transport.flatMap(job =>
    job.items.flatMap(item => {
      const sku = skus.find(k => k.id === item.skuId);
      if (!sku) return [];
      const sup = suppliers.find(s => s.id === sku.supplierId);
      if (!sup) return [];
      return [{ job, sku, supplier: sup }];
    })
  ).sort((a, b) => (b.job.scheduledDate ?? "").localeCompare(a.job.scheduledDate ?? ""));

  const DOT: Record<TransportJob["status"], string> = { pending:"bg-amber-400", in_transit:"bg-blue-500", delivered:"bg-green-500", cancelled:"bg-slate-400" };
  const LBL: Record<TransportJob["status"], string> = { pending:"Pending", in_transit:"In Transit", delivered:"Delivered", cancelled:"Cancelled" };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        {view === "edit" && (
          <button onClick={() => setView("list")} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suppliers</p>
          {view === "edit" && <p className="text-sm font-bold text-slate-800 truncate">{isNew ? "New Supplier" : form.name}</p>}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {(["active","history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t === "active" ? "Suppliers" : "History"}
                </button>
              ))}
            </div>
            {tab === "active" && <button onClick={openNew} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">+ New</button>}
          </div>
        )}
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {flash && <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

      {view === "list" && tab === "active" && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {view === "list" ? (
        <>
          {tab === "active" ? (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {visible.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-400">{suppliers.length === 0 ? "No suppliers yet" : "No matches"}</p>}
              {visible.map(s => (
                <button key={s.id} onClick={() => openEdit(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">{s.country || "—"} · {s.currency} · {s.leadTimeDays}d lead</p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium shrink-0">{skuCount(s.id)} SKUs</span>
                  <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Shipment Activity by Supplier</p>
              {history.length === 0 ? <p className="text-xs text-slate-400">No activity yet</p> : history.map(({ job, sku, supplier }, i) => (
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium block mb-0.5 ${job.status === "delivered" ? "bg-green-100 text-green-700" : job.status === "in_transit" ? "bg-blue-100 text-blue-700" : job.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{LBL[job.status]}</span>
                    {job.scheduledDate && <span className="text-[10px] text-slate-400">{job.scheduledDate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">{suppliers.length} suppliers · {skus.length} linked SKUs</div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
            <F label="Contact Name"><input value={form.contactName} onChange={e => f("contactName", e.target.value)} className={inp} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Email"><input type="email" value={form.email} onChange={e => f("email", e.target.value)} className={inp} /></F>
              <F label="Phone"><input value={form.phone} onChange={e => f("phone", e.target.value)} className={inp} /></F>
            </div>
            <F label="Address"><input value={form.address} onChange={e => f("address", e.target.value)} className={inp} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Country"><input value={form.country} onChange={e => f("country", e.target.value)} className={inp} /></F>
              <F label="Currency"><select value={form.currency} onChange={e => f("currency", e.target.value)} className={inp}>{["GBP","EUR","USD","CAD","AUD"].map(c => <option key={c}>{c}</option>)}</select></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Lead Time (days)"><input type="number" min={0} value={form.leadTimeDays} onChange={e => f("leadTimeDays", Number(e.target.value))} className={inp} /></F>
              <F label="Payment Terms"><input value={form.paymentTerms} onChange={e => f("paymentTerms", e.target.value)} placeholder="Net 30" className={inp} /></F>
            </div>
            <F label="Status"><select value={form.status} onChange={e => f("status", e.target.value as Supplier["status"])} className={inp}><option value="active">Active</option><option value="inactive">Inactive</option></select></F>
            <F label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>
            {!isNew && selected && (() => {
              const linked = skus.filter(k => k.supplierId === selected.id);
              if (!linked.length) return null;
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Linked SKUs ({linked.length})</p>
                  <div className="space-y-1">
                    {linked.map(k => (
                      <div key={k.id} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1.5 text-xs">
                        <span className="font-mono text-slate-700">{k.code}</span>
                        <span className="flex-1 text-slate-400 truncate">{k.name}</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>{k.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 flex gap-3 bg-white">
            <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg">{saving ? "Saving…" : isNew ? "Create Supplier" : "Save Changes"}</button>
            {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200">Delete</button>}
          </div>
        </>
      )}
    </div>
  );
}
