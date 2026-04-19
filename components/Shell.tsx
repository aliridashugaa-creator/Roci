"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { TransportJob, SKU, StockEntry, AppNotification } from "@/lib/store";
import TopNav from "./TopNav";

const MapView = dynamic(() => import("@/app/transport/MapView"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-slate-100" />,
});

// Lazy-load panels
const CataloguePanel  = dynamic(() => import("./panels/CataloguePanel"),  { ssr: false });
const SuppliersPanel  = dynamic(() => import("./panels/SuppliersPanel"),  { ssr: false });
const WorkspacePanel  = dynamic(() => import("./panels/WorkspacePanel"),  { ssr: false });
const ShipmentsPanel  = dynamic(() => import("./panels/ShipmentsPanel"),  { ssr: false });
const AnalyticsPanel  = dynamic(() => import("./panels/AnalyticsPanel"),  { ssr: false });
const SKUEditPanel    = dynamic(() => import("./panels/SKUEditPanel"),    { ssr: false });

export type NavPanel = "catalogue" | "suppliers" | "workspace" | "shipments" | "analytics";

// Job edit form state
const BLANK_JOB = {
  origin: "", destination: "", driver: "", trackingRef: "",
  status: "pending" as TransportJob["status"],
  scheduledDate: "", deliveredDate: "", notes: "",
};

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const STATUS_DOT: Record<TransportJob["status"], string> = {
  pending: "bg-amber-400", in_transit: "bg-blue-500",
  delivered: "bg-green-500", cancelled: "bg-slate-400",
};

export default function Shell() {
  // ── global data ─────────────────────────────────────────────────────────────
  const [jobs,   setJobs]   = useState<TransportJob[]>([]);
  const [skus,   setSkus]   = useState<SKU[]>([]);
  const [stock,  setStock]  = useState<StockEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ── panel state ──────────────────────────────────────────────────────────────
  const [openPanel,   setOpenPanel]   = useState<NavPanel | null>(null);

  // ── right panel: job edit ────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState<TransportJob | null>(null);
  const [isNewJob,    setIsNewJob]    = useState(false);
  const [jobForm,     setJobForm]     = useState(BLANK_JOB);
  const [savingJob,   setSavingJob]   = useState(false);
  const [addItem,     setAddItem]     = useState({ skuId: "", qty: "" });
  const [addingItem,  setAddingItem]  = useState(false);

  // ── right panel: SKU edit ────────────────────────────────────────────────────
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const [isNewSKU,    setIsNewSKU]    = useState(false);

  // ── flash ────────────────────────────────────────────────────────────────────
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500); };

  const reload = useCallback(async () => {
    const [j, sk, st] = await Promise.all([
      fetch("/api/transport").then(r => r.json()),
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/stock").then(r => r.json()),
    ]);
    setJobs(j); setSkus(sk); setStock(st);

    // Compute notifications
    const notifs: AppNotification[] = [];
    (st as StockEntry[]).forEach((entry) => {
      const sku = (sk as SKU[]).find(k => k.id === entry.skuId);
      if (!sku) return;
      if (entry.quantity === 0 && sku.minStockLevel != null) {
        notifs.push({ id: `${entry.id}_out`, type: "out_of_stock", skuId: sku.id, skuCode: sku.code, skuName: sku.name, currentQty: 0, threshold: sku.minStockLevel, locationLabel: entry.location });
      } else if (sku.reorderPoint != null && entry.quantity <= sku.reorderPoint) {
        notifs.push({ id: `${entry.id}_reorder`, type: "reorder", skuId: sku.id, skuCode: sku.code, skuName: sku.name, currentQty: entry.quantity, threshold: sku.reorderPoint, locationLabel: entry.location });
      } else if (sku.minStockLevel != null && entry.quantity <= sku.minStockLevel) {
        notifs.push({ id: `${entry.id}_low`, type: "low_stock", skuId: sku.id, skuCode: sku.code, skuName: sku.name, currentQty: entry.quantity, threshold: sku.minStockLevel, locationLabel: entry.location });
      }
    });
    setNotifications(notifs);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── job edit helpers ─────────────────────────────────────────────────────────
  const fj = (k: keyof typeof BLANK_JOB, v: unknown) => setJobForm(p => ({ ...p, [k]: v }));

  const openNewJob = () => { setIsNewJob(true); setSelectedJob(null); setJobForm(BLANK_JOB); setAddingItem(false); setSelectedSKU(null); setIsNewSKU(false); };
  const openEditJob = (j: TransportJob) => {
    setIsNewJob(false); setSelectedJob(j);
    setJobForm({ origin: j.origin, destination: j.destination, driver: j.driver ?? "",
      trackingRef: j.trackingRef, status: j.status,
      scheduledDate: j.scheduledDate ?? "", deliveredDate: j.deliveredDate ?? "", notes: j.notes });
    setAddingItem(false);
    setSelectedSKU(null); setIsNewSKU(false);
  };
  const closeJob = () => { setSelectedJob(null); setIsNewJob(false); };

  const saveJob = async () => {
    if (!jobForm.origin.trim() || !jobForm.destination.trim()) { showFlash("Origin and destination required", false); return; }
    setSavingJob(true);
    const payload = { ...jobForm, scheduledDate: jobForm.scheduledDate || null, deliveredDate: jobForm.deliveredDate || null };
    const res = isNewJob
      ? await fetch("/api/transport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/transport/${selectedJob!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSavingJob(false); return; }
    showFlash(isNewJob ? `${data.ref} created` : "Job updated");
    setSavingJob(false); await reload();
    if (isNewJob) { setIsNewJob(false); setSelectedJob(data); }
    else { const fresh = await fetch(`/api/transport/${data.id}`).then(r => r.json()); setSelectedJob(fresh); }
  };

  const delJob = async () => {
    if (!selectedJob || !confirm(`Delete ${selectedJob.ref}?`)) return;
    await fetch(`/api/transport/${selectedJob.id}`, { method: "DELETE" });
    showFlash("Job deleted"); closeJob(); await reload();
  };

  const addLineItem = async () => {
    if (!selectedJob || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const updated: TransportJob = { ...selectedJob, items: [...selectedJob.items, { skuId: addItem.skuId, qty: Number(addItem.qty) || 0 }] };
    const res = await fetch(`/api/transport/${selectedJob.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed", false); return; }
    showFlash("Item added"); setAddItem({ skuId: "", qty: "" }); setAddingItem(false);
    await reload(); setSelectedJob(data);
  };

  const removeItem = async (idx: number) => {
    if (!selectedJob) return;
    const updated: TransportJob = { ...selectedJob, items: selectedJob.items.filter((_, i) => i !== idx) };
    const res = await fetch(`/api/transport/${selectedJob.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelectedJob(data); }
  };

  const skuLabel = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const totalWeight = (job: TransportJob) => job.items.reduce((s, item) => {
    const sku = skus.find(k => k.id === item.skuId);
    return s + (sku?.weight ?? 0) * item.qty;
  }, 0);

  // ── SKU edit helpers ─────────────────────────────────────────────────────────
  const openNewSKU = () => { setIsNewSKU(true); setSelectedSKU(null); closeJob(); };
  const openEditSKU = (sku: SKU) => { setIsNewSKU(false); setSelectedSKU(sku); closeJob(); };
  const closeSKU = () => { setSelectedSKU(null); setIsNewSKU(false); };

  // ── panel helpers ────────────────────────────────────────────────────────────
  const togglePanel = (p: NavPanel) => {
    setOpenPanel(prev => prev === p ? null : p);
    closeSKU(); closeJob();
  };

  const jobPanelOpen = selectedJob !== null || isNewJob;
  const skuPanelOpen = selectedSKU !== null || isNewSKU;
  const rightPanelOpen = jobPanelOpen || skuPanelOpen;

  // Wider panel for catalogue / suppliers to accommodate their own two-col layout if needed
  const panelWidth = (openPanel === "catalogue" || openPanel === "suppliers") ? "w-[560px]" : "w-[480px]";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav
        openPanel={openPanel}
        onTogglePanel={togglePanel}
        jobCount={jobs.length}
        notifications={notifications}
      />

      <div className="flex-1 relative overflow-hidden">
        {/* ── map — always full screen ── */}
        <div className="absolute inset-0">
          <MapView
            jobs={jobs}
            skus={skus}
            selectedId={selectedJob?.id ?? null}
            onSelect={id => {
              const j = jobs.find(x => x.id === id);
              if (j) { openEditJob(j); if (!openPanel) setOpenPanel("shipments"); }
            }}
          />
        </div>

        {/* ── left nav panels ── */}
        {openPanel !== "suppliers" && (
          <div className={`absolute left-0 top-0 bottom-0 ${panelWidth} bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${openPanel ? "translate-x-0" : "-translate-x-full"} z-20`}>
            {openPanel === "catalogue"  && (
              <CataloguePanel
                onClose={() => setOpenPanel(null)}
                onSelectSKU={openEditSKU}
                onNewSKU={openNewSKU}
                selectedSKUId={selectedSKU?.id ?? null}
                stock={stock}
              />
            )}
            {openPanel === "workspace"  && (
              <WorkspacePanel
                onClose={() => setOpenPanel(null)}
                onSelectJob={j => { openEditJob(j); }}
                onNewJob={openNewJob}
              />
            )}
            {openPanel === "shipments"  && (
              <ShipmentsPanel
                jobs={jobs}
                skus={skus}
                selectedJobId={selectedJob?.id ?? null}
                onSelectJob={openEditJob}
                onNewJob={openNewJob}
                onClose={() => setOpenPanel(null)}
              />
            )}
            {openPanel === "analytics"  && <AnalyticsPanel  onClose={() => setOpenPanel(null)} />}
          </div>
        )}

        {/* ── right nav panel: suppliers ── */}
        <div className={`absolute right-0 top-0 bottom-0 w-[560px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${openPanel === "suppliers" ? "translate-x-0" : "translate-x-full"} z-20`}>
          {openPanel === "suppliers" && <SuppliersPanel onClose={() => setOpenPanel(null)} />}
        </div>

        {/* ── right panel: job edit ── */}
        {jobPanelOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white shadow-xl border-l border-slate-200 flex flex-col z-30 animate-slide-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNewJob ? "New Shipment" : "Edit Job"}</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{isNewJob ? "—" : selectedJob?.ref}</p>
              </div>
              <button onClick={closeJob} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {flash && (
              <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {flash.msg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Origin *"><input value={jobForm.origin} onChange={e => fj("origin", e.target.value)} placeholder="London" className={inp} /></Field>
                <Field label="Destination *"><input value={jobForm.destination} onChange={e => fj("destination", e.target.value)} placeholder="Manchester" className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Driver"><input value={jobForm.driver} onChange={e => fj("driver", e.target.value)} className={inp} /></Field>
                <Field label="Tracking Ref"><input value={jobForm.trackingRef} onChange={e => fj("trackingRef", e.target.value)} className={inp} /></Field>
              </div>
              <Field label="Status">
                <select value={jobForm.status} onChange={e => fj("status", e.target.value as TransportJob["status"])} className={inp}>
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Scheduled"><input type="date" value={jobForm.scheduledDate} onChange={e => fj("scheduledDate", e.target.value)} className={inp} /></Field>
                <Field label="Delivered"><input type="date" value={jobForm.deliveredDate} onChange={e => fj("deliveredDate", e.target.value)} className={inp} /></Field>
              </div>
              <Field label="Notes">
                <textarea value={jobForm.notes} onChange={e => fj("notes", e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </Field>
              {!isNewJob && selectedJob && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SKU Items</p>
                    <button onClick={() => setAddingItem(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {addingItem ? "Cancel" : "+ Add"}
                    </button>
                  </div>
                  {addingItem && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
                      <select value={addItem.skuId} onChange={e => setAddItem(a => ({ ...a, skuId: e.target.value }))} className={inp}>
                        <option value="">— select SKU —</option>
                        {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                      </select>
                      <input type="number" min={0} value={addItem.qty} onChange={e => setAddItem(a => ({ ...a, qty: e.target.value }))} className={inp} placeholder="Quantity" />
                      <div className="flex gap-2">
                        <button onClick={addLineItem} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">Add</button>
                        <button onClick={() => setAddingItem(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  )}
                  {selectedJob.items.length === 0 && !addingItem && <p className="text-xs text-slate-400">No items yet</p>}
                  <div className="space-y-1">
                    {selectedJob.items.map((item, i) => {
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
              <button onClick={saveJob} disabled={savingJob}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
                {savingJob ? "Saving…" : isNewJob ? "Create Job" : "Save Changes"}
              </button>
              {!isNewJob && (
                <button onClick={delJob}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">
                  Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── right panel: SKU edit ── */}
        {skuPanelOpen && (
          <SKUEditPanel
            sku={selectedSKU}
            isNew={isNewSKU}
            stock={stock}
            onClose={closeSKU}
            onSaved={() => { reload(); }}
            onDeleted={() => { closeSKU(); reload(); }}
          />
        )}
      </div>
    </div>
  );
}
