"use client";

import { useCallback, useEffect, useState } from "react";
import type { TransportJob, SKU } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const BLANK = {
  origin: "", destination: "", carrier: "", trackingRef: "",
  status: "pending" as TransportJob["status"],
  scheduledDate: "", deliveredDate: "", notes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const STATUS_COLOURS: Record<TransportJob["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function TransportPage() {
  const [jobs, setJobs] = useState<TransportJob[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [selected, setSelected] = useState<TransportJob | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [addItem, setAddItem] = useState({ skuId: "", qty: "" });
  const [addingItem, setAddingItem] = useState(false);

  const reload = useCallback(async () => {
    const [j, sk] = await Promise.all([fetch("/api/transport").then(r => r.json()), fetch("/api/skus").then(r => r.json())]);
    setJobs(j); setSkus(sk);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setIsNew(true); setSelected(null); setForm(BLANK); };
  const openEdit = (j: TransportJob) => {
    setIsNew(false); setSelected(j);
    setForm({ origin: j.origin, destination: j.destination, carrier: j.carrier, trackingRef: j.trackingRef, status: j.status, scheduledDate: j.scheduledDate ?? "", deliveredDate: j.deliveredDate ?? "", notes: j.notes });
  };

  const save = async () => {
    if (!form.origin.trim() || !form.destination.trim()) { showFlash("Origin and destination required", false); return; }
    setSaving(true);
    const payload = { ...form, scheduledDate: form.scheduledDate || null, deliveredDate: form.deliveredDate || null };
    const res = isNew
      ? await fetch("/api/transport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/transport/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.ref} created` : "Job updated");
    setSaving(false); await reload();
    if (isNew) { setIsNew(false); setSelected(data); }
    else setSelected(data);
  };

  const del = async () => {
    if (!selected || !confirm(`Delete job ${selected.ref}?`)) return;
    await fetch(`/api/transport/${selected.id}`, { method: "DELETE" });
    showFlash("Job deleted");
    setSelected(null); setIsNew(false); await reload();
  };

  const addLineItem = async () => {
    if (!selected || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const updated: TransportJob = {
      ...selected,
      items: [...selected.items, { skuId: addItem.skuId, qty: Number(addItem.qty) || 0 }],
    };
    const res = await fetch(`/api/transport/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed to add item", false); return; }
    showFlash("Item added"); setAddItem({ skuId: "", qty: "" }); setAddingItem(false);
    await reload(); setSelected(data);
  };

  const removeItem = async (idx: number) => {
    if (!selected) return;
    const updated: TransportJob = { ...selected, items: selected.items.filter((_, i) => i !== idx) };
    const res = await fetch(`/api/transport/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelected(data); }
  };

  const skuLabel = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const panelOpen = selected !== null || isNew;
  const visible = jobs.filter(j => {
    if (filterStatus && j.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!j.ref.toLowerCase().includes(q) && !j.origin.toLowerCase().includes(q) && !j.destination.toLowerCase().includes(q) && !j.carrier.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex-wrap">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Transport</h2>
            <p className="text-xs text-slate-400">{jobs.length} jobs</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ref, route, carrier…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">+ New Job</button>
        </div>
        {flash && <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visible.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">{jobs.length === 0 ? "No transport jobs yet" : "No matches"}</td></tr>}
              {visible.map(j => (
                <tr key={j.id} onClick={() => openEdit(j)} className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === j.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{j.ref}</td>
                  <td className="px-4 py-3 text-slate-600">{j.origin} → {j.destination}</td>
                  <td className="px-4 py-3 text-slate-500">{j.carrier || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{j.scheduledDate ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><span className="bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded">{j.items.length}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLOURS[j.status]}`}>{j.status.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <div className="w-[460px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New Transport Job" : "Edit Job"}</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : selected?.ref}</p>
            </div>
            <button onClick={() => { setSelected(null); setIsNew(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origin *"><input value={form.origin} onChange={e => f("origin", e.target.value)} placeholder="e.g. London" className={inp} /></Field>
              <Field label="Destination *"><input value={form.destination} onChange={e => f("destination", e.target.value)} placeholder="e.g. Manchester" className={inp} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carrier"><input value={form.carrier} onChange={e => f("carrier", e.target.value)} placeholder="DHL, FedEx…" className={inp} /></Field>
              <Field label="Tracking Ref"><input value={form.trackingRef} onChange={e => f("trackingRef", e.target.value)} className={inp} /></Field>
            </div>
            <Field label="Status">
              <select value={form.status} onChange={e => f("status", e.target.value as TransportJob["status"])} className={inp}>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Scheduled Date"><input type="date" value={form.scheduledDate} onChange={e => f("scheduledDate", e.target.value)} className={inp} /></Field>
              <Field label="Delivered Date"><input type="date" value={form.deliveredDate} onChange={e => f("deliveredDate", e.target.value)} className={inp} /></Field>
            </div>
            <Field label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></Field>

            {!isNew && selected && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SKU Items</p>
                  <button onClick={() => setAddingItem(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Item</button>
                </div>
                {addingItem && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">SKU</label>
                      <select value={addItem.skuId} onChange={e => setAddItem(a => ({ ...a, skuId: e.target.value }))} className={inp}>
                        <option value="">— select SKU —</option>
                        {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                      <input type="number" min={0} value={addItem.qty} onChange={e => setAddItem(a => ({ ...a, qty: e.target.value }))} className={inp} placeholder="0" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addLineItem} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700">Add</button>
                      <button onClick={() => setAddingItem(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                )}
                {selected.items.length === 0 && <p className="text-xs text-slate-400 py-2">No items yet</p>}
                <div className="space-y-1">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{skuLabel(item.skuId)}</p>
                        <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                      </div>
                      <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600 ml-3">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">{saving ? "Saving…" : isNew ? "Create Job" : "Save Changes"}</button>
            {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
}
