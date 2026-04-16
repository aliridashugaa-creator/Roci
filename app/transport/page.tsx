"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { TransportJob, SKU } from "@/lib/store";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
      Loading map…
    </div>
  ),
});

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const BLANK = {
  origin: "", destination: "", driver: "", trackingRef: "",
  status: "pending" as TransportJob["status"],
  scheduledDate: "", deliveredDate: "", notes: "",
};

const STATUS_DOT: Record<TransportJob["status"], string> = {
  pending:    "bg-amber-400",
  in_transit: "bg-blue-500",
  delivered:  "bg-green-500",
  cancelled:  "bg-slate-400",
};
const STATUS_LABEL: Record<TransportJob["status"], string> = {
  pending: "Pending", in_transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function TransportPage() {
  const [jobs, setJobs] = useState<TransportJob[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [selected, setSelected] = useState<TransportJob | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [addItem, setAddItem] = useState({ skuId: "", qty: "" });
  const [addingItem, setAddingItem] = useState(false);

  const reload = useCallback(async () => {
    const [j, sk] = await Promise.all([
      fetch("/api/transport").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
    ]);
    setJobs(j); setSkus(sk);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500);
  };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setIsNew(true); setSelected(null); setForm(BLANK); setAddingItem(false); };
  const openEdit = (j: TransportJob) => {
    setIsNew(false); setSelected(j);
    setForm({
      origin: j.origin, destination: j.destination, driver: j.driver ?? "",
      trackingRef: j.trackingRef, status: j.status,
      scheduledDate: j.scheduledDate ?? "", deliveredDate: j.deliveredDate ?? "",
      notes: j.notes,
    });
    setAddingItem(false);
  };
  const closePanel = () => { setSelected(null); setIsNew(false); };

  const save = async () => {
    if (!form.origin.trim() || !form.destination.trim()) {
      showFlash("Origin and destination are required", false); return;
    }
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
    else { const fresh = await fetch(`/api/transport/${data.id}`).then(r => r.json()); setSelected(fresh); }
  };

  const del = async () => {
    if (!selected || !confirm(`Delete job ${selected.ref}?`)) return;
    await fetch(`/api/transport/${selected.id}`, { method: "DELETE" });
    showFlash("Job deleted");
    closePanel(); await reload();
  };

  const addLineItem = async () => {
    if (!selected || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const updated: TransportJob = {
      ...selected,
      items: [...selected.items, { skuId: addItem.skuId, qty: Number(addItem.qty) || 0 }],
    };
    const res = await fetch(`/api/transport/${selected.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed", false); return; }
    showFlash("Item added"); setAddItem({ skuId: "", qty: "" }); setAddingItem(false);
    await reload(); setSelected(data);
  };

  const removeItem = async (idx: number) => {
    if (!selected) return;
    const updated: TransportJob = { ...selected, items: selected.items.filter((_, i) => i !== idx) };
    const res = await fetch(`/api/transport/${selected.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelected(data); }
  };

  const skuLabel = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };

  const totalWeight = (job: TransportJob) =>
    job.items.reduce((s, item) => {
      const sku = skus.find(k => k.id === item.skuId);
      return s + (sku?.weight ?? 0) * item.qty;
    }, 0);

  const visibleJobs = filterStatus ? jobs.filter(j => j.status === filterStatus) : jobs;
  const panelOpen = selected !== null || isNew;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── left sidebar ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        {/* sidebar header */}
        <div className="px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Transport</h2>
              <p className="text-xs text-slate-400">{jobs.length} jobs</p>
            </div>
            <button onClick={openNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              + New Job
            </button>
          </div>
          {/* status filter pills */}
          <div className="flex gap-1 flex-wrap">
            {(["", "pending", "in_transit", "delivered", "cancelled"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {s === "" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {flash && (
          <div className={`mx-3 mt-2 px-3 py-1.5 rounded-lg text-xs ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {flash.msg}
          </div>
        )}

        {/* job list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {visibleJobs.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-slate-400">
              {jobs.length === 0 ? "No jobs yet" : "No matches"}
            </div>
          )}
          {visibleJobs.map(j => {
            const kg = totalWeight(j);
            const isSelected = selected?.id === j.id;
            return (
              <button key={j.id} onClick={() => openEdit(j)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-semibold text-slate-800">{j.ref}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[j.status]}`} />
                    {STATUS_LABEL[j.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-700 truncate">{j.origin} → {j.destination}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  {j.driver && <span>🚛 {j.driver}</span>}
                  {j.scheduledDate && <span>ETA {j.scheduledDate}</span>}
                  {kg > 0 && <span>{kg.toFixed(1)} kg</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── map area ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          jobs={visibleJobs}
          skus={skus}
          selectedId={selected?.id ?? null}
          onSelect={id => { const j = jobs.find(x => x.id === id); if (j) openEdit(j); }}
        />

        {/* ── edit panel (overlaid on map) ── */}
        {panelOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white shadow-xl border-l border-slate-200 flex flex-col z-[1000] animate-slide-down">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New Transport Job" : "Edit Job"}</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : selected?.ref}</p>
              </div>
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Origin *"><input value={form.origin} onChange={e => f("origin", e.target.value)} placeholder="e.g. London" className={inp} /></Field>
                <Field label="Destination *"><input value={form.destination} onChange={e => f("destination", e.target.value)} placeholder="e.g. Manchester" className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Driver"><input value={form.driver} onChange={e => f("driver", e.target.value)} placeholder="Driver name" className={inp} /></Field>
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
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </Field>

              {/* SKU Items — only when editing existing job */}
              {!isNew && selected && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SKU Items</p>
                    <button onClick={() => setAddingItem(v => !v)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {addingItem ? "Cancel" : "+ Add"}
                    </button>
                  </div>
                  {addingItem && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">SKU</label>
                        <select value={addItem.skuId} onChange={e => setAddItem(a => ({ ...a, skuId: e.target.value }))} className={inp}>
                          <option value="">— select SKU —</option>
                          {skus.filter(s => s.status === "active").map(s => (
                            <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                        <input type="number" min={0} value={addItem.qty}
                          onChange={e => setAddItem(a => ({ ...a, qty: e.target.value }))}
                          className={inp} placeholder="0" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addLineItem}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
                          Add
                        </button>
                        <button onClick={() => setAddingItem(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  )}
                  {selected.items.length === 0 && !addingItem && (
                    <p className="text-xs text-slate-400 py-1">No items yet</p>
                  )}
                  <div className="space-y-1">
                    {selected.items.map((item, i) => {
                      const sku = skus.find(s => s.id === item.skuId);
                      const kg = (sku?.weight ?? 0) * item.qty;
                      return (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-slate-700">{skuLabel(item.skuId)}</p>
                            <p className="text-xs text-slate-400">Qty: {item.qty}{kg > 0 ? ` · ${kg.toFixed(1)} kg` : ""}</p>
                          </div>
                          <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600 ml-3">Remove</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
                {saving ? "Saving…" : isNew ? "Create Job" : "Save Changes"}
              </button>
              {!isNew && (
                <button onClick={del}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
