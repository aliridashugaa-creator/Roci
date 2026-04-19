"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, SKU, StockEntry, Supplier, TransportJob } from "@/lib/store";

// ── helpers ───────────────────────────────────────────────────────────────────
const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}
function SectionHead({ title }: { title: string }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2 pb-1 border-b border-slate-100 mt-1">{title}</p>;
}

// ── status constants ──────────────────────────────────────────────────────────
const PROJ_STATUS_CLS: Record<Project["status"], string> = {
  planning:  "bg-slate-100 text-slate-600",
  active:    "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
  on_hold:   "bg-amber-100 text-amber-700",
};
const JOB_DOT: Record<TransportJob["status"], string> = {
  pending:    "bg-amber-400",
  in_transit: "bg-blue-500",
  delivered:  "bg-green-500",
  cancelled:  "bg-slate-400",
};
const JOB_LBL: Record<TransportJob["status"], string> = {
  pending:    "Pending",
  in_transit: "In Transit",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};

const PROJ_BLANK = {
  name: "", description: "", status: "active" as Project["status"],
  clientName: "", supplierId: "", warehouseLocation: "", targetAddress: "", paymentTerms: "",
  startDate: "", endDate: "", notes: "",
};

interface Props {
  onClose: () => void;
  onSelectJob: (job: TransportJob) => void;
  onNewJob: () => void;
}

// ── OPERATIONS TAB ─────────────────────────────────────────────────────────────
function OperationsTab({
  suppliers, skus, stock, jobs, onJobsChange, onSelectJob,
}: {
  suppliers: Supplier[];
  skus: SKU[];
  stock: StockEntry[];
  jobs: TransportJob[];
  onJobsChange: () => void;
  onSelectJob: (j: TransportJob) => void;
}) {
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<"active" | "history">("active");
  const [view,       setView]       = useState<"list" | "edit">("list");
  const [selected,   setSelected]   = useState<Project | null>(null);
  const [isNew,      setIsNew]      = useState(false);
  const [form,       setForm]       = useState(PROJ_BLANK);
  const [saving,     setSaving]     = useState(false);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [addItem,    setAddItem]    = useState({ skuId: "", qtyRequired: "", qtyAllocated: "" });
  const [addingItem, setAddingItem] = useState(false);

  const reload = useCallback(async () => {
    const p = await fetch("/api/projects").then(r => r.json());
    setProjects(p);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3500);
  };
  const f = (k: keyof typeof PROJ_BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setIsNew(true); setSelected(null); setForm(PROJ_BLANK); setView("edit"); };
  const openEdit = (p: Project) => {
    setIsNew(false); setSelected(p);
    setForm({
      name: p.name, description: p.description, status: p.status,
      clientName: p.clientName ?? "", supplierId: p.supplierId ?? "",
      warehouseLocation: p.warehouseLocation ?? "", targetAddress: p.targetAddress ?? "",
      paymentTerms: p.paymentTerms ?? "", startDate: p.startDate ?? "", endDate: p.endDate ?? "",
      notes: p.notes,
    });
    setView("edit");
  };

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name required", false); return; }
    setSaving(true);
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
    const res = isNew
      ? await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/projects/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false);
    await reload();
    if (isNew) { setIsNew(false); setSelected(data); } else setSelected(data);
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/projects/${selected.id}`, { method: "DELETE" });
    showFlash(`${selected.name} deleted`);
    setView("list");
    await reload();
  };

  // Auto-allocate SKU to a shipment linked to this project
  const autoAllocateToShipment = async (project: Project, skuId: string, qty: number) => {
    const projJobs = jobs.filter(j => j.projectId === project.id);
    const origin      = project.warehouseLocation?.trim() || "Warehouse";
    const destination = project.targetAddress?.trim()     || "Delivery Address";

    if (projJobs.length > 0) {
      // Find the first pending/in-transit job, otherwise use the most recent
      const activeJob = projJobs.find(j => j.status === "pending" || j.status === "in_transit") ?? projJobs[0];
      const existing  = activeJob.items.find(i => i.skuId === skuId);
      const newItems  = existing
        ? activeJob.items.map(i => i.skuId === skuId ? { ...i, qty: i.qty + qty } : i)
        : [...activeJob.items, { skuId, qty }];
      await fetch(`/api/transport/${activeJob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activeJob, items: newItems }),
      });
    } else {
      // Create a new transport job for this project
      await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          origin,
          destination,
          items: [{ skuId, qty }],
          status: "pending",
          notes: `Auto-created for operation: ${project.name}`,
        }),
      });
    }
    onJobsChange();
  };

  const addLineItem = async () => {
    if (!selected || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const qtyReq   = Number(addItem.qtyRequired)  || 0;
    const qtyAlloc = Number(addItem.qtyAllocated) || 0;
    const updated: Project = {
      ...selected,
      items: [...selected.items, { skuId: addItem.skuId, qtyRequired: qtyReq, qtyAllocated: qtyAlloc }],
    };
    const res = await fetch(`/api/projects/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed", false); return; }
    // Auto-allocate to linked shipment
    await autoAllocateToShipment(selected, addItem.skuId, Math.max(qtyReq, 1));
    showFlash("SKU added & allocated to shipment");
    setAddItem({ skuId: "", qtyRequired: "", qtyAllocated: "" });
    setAddingItem(false);
    await reload();
    setSelected(data);
  };

  const removeItem = async (idx: number) => {
    if (!selected) return;
    const updated: Project = { ...selected, items: selected.items.filter((_, i) => i !== idx) };
    const res  = await fetch(`/api/projects/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelected(data); }
  };

  // ── data helpers ──────────────────────────────────────────────────────────
  const skuOf      = (id: string) => skus.find(x => x.id === id);
  const skuLabel   = (id: string) => { const s = skuOf(id); return s ? `${s.code} · ${s.name}` : id; };
  const stockQty   = (skuId: string) => stock.filter(s => s.skuId === skuId).reduce((n, s) => n + s.quantity, 0);
  const linkedJobs = (projectId: string) => jobs.filter(j => j.projectId === projectId);
  const supplierOf = (id: string) => suppliers.find(s => s.id === id);

  const active      = projects.filter(p => ["planning", "active", "on_hold"].includes(p.status));
  const past        = projects.filter(p => ["completed", "cancelled"].includes(p.status));
  const visibleList = (tab === "active" ? active : past).filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* sub-header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
        {view === "edit" && (
          <button onClick={() => setView("list")} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div className="flex-1 text-xs font-medium text-slate-600">
          {view === "edit" ? (isNew ? "New Operation" : form.name) : "Operations"}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {(["active", "history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t === "active" ? "Active" : "History"}
                </button>
              ))}
            </div>
            {tab === "active" && (
              <button onClick={openNew} className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700">+ New</button>
            )}
          </div>
        )}
      </div>

      {flash && (
        <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {flash.msg}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" ? (
        <>
          <div className="px-4 pt-2 pb-2 shrink-0">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search operations…"
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {visibleList.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                {tab === "active" ? (active.length === 0 ? "No active operations" : "No matches") : "No past operations"}
              </p>
            )}
            {visibleList.map(p => {
              const pJobs = linkedJobs(p.id);
              const sup   = supplierOf(p.supplierId);
              return (
                <button key={p.id} onClick={() => openEdit(p)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize shrink-0 ${PROJ_STATUS_CLS[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  {p.clientName && <p className="text-xs text-slate-500 mb-1.5">Client: {p.clientName}</p>}

                  {/* SKU allocation rows */}
                  {p.items.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {p.items.slice(0, 3).map((item, idx) => {
                        const s      = skuOf(item.skuId);
                        const pct    = item.qtyRequired > 0 ? Math.round((item.qtyAllocated / item.qtyRequired) * 100) : 100;
                        const inStk  = stockQty(item.skuId);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 w-20 shrink-0 truncate">{s?.code ?? "—"}</span>
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-400" : pct > 50 ? "bg-blue-400" : "bg-amber-400"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-12 text-right shrink-0">{item.qtyAllocated}/{item.qtyRequired}</span>
                            <span className={`text-[10px] w-10 text-right shrink-0 ${inStk === 0 ? "text-red-400" : "text-green-600"}`}>
                              {inStk > 0 ? `${inStk.toLocaleString()} ✓` : "0 ✕"}
                            </span>
                          </div>
                        );
                      })}
                      {p.items.length > 3 && (
                        <p className="text-[10px] text-slate-400 pl-22">+{p.items.length - 3} more SKUs</p>
                      )}
                    </div>
                  )}

                  {/* Shipment + supplier footer */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {pJobs.length > 0 ? (
                      pJobs.slice(0, 2).map(j => (
                        <span key={j.id} className="flex items-center gap-1 text-[10px] bg-slate-100 rounded px-1.5 py-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${JOB_DOT[j.status]}`} />
                          <span className="font-mono text-slate-600">{j.ref}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">No shipment</span>
                    )}
                    {pJobs.length > 2 && <span className="text-[10px] text-slate-400">+{pJobs.length - 2} more</span>}
                    {sup && <span className="text-[10px] text-slate-400 truncate">· {sup.name}</span>}
                    {p.endDate && <span className="text-[10px] text-slate-300 ml-auto">Due {p.endDate}</span>}
                    <svg className="w-4 h-4 text-slate-200 shrink-0 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">
            {active.length} active · {past.length} past
          </div>
        </>
      ) : (
        /* ── EDIT/DETAIL VIEW ── */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Core fields */}
            <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
            <F label="Description">
              <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </F>
            <F label="Status">
              <select value={form.status} onChange={e => f("status", e.target.value as Project["status"])} className={inp}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </F>

            <SectionHead title="Client & Logistics" />
            <F label="Client Name"><input value={form.clientName} onChange={e => f("clientName", e.target.value)} className={inp} /></F>
            <F label="Supplier">
              <select value={form.supplierId} onChange={e => f("supplierId", e.target.value)} className={inp}>
                <option value="">— none —</option>
                {suppliers.filter(s => s.status === "active").map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </F>
            <F label="Warehouse / Origin">
              <input value={form.warehouseLocation} onChange={e => f("warehouseLocation", e.target.value)} placeholder="e.g. Warehouse A, Manchester" className={inp} />
            </F>
            <F label="Target Address">
              <input value={form.targetAddress} onChange={e => f("targetAddress", e.target.value)} placeholder="Delivery address" className={inp} />
            </F>
            <F label="Payment Terms">
              <input value={form.paymentTerms} onChange={e => f("paymentTerms", e.target.value)} placeholder="Net 30, COD, etc." className={inp} />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Start Date"><input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} className={inp} /></F>
              <F label="End Date"><input type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} className={inp} /></F>
            </div>
            <F label="Notes">
              <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </F>

            {!isNew && selected && (() => {
              const projJobs       = linkedJobs(selected.id);
              const sup            = supplierOf(selected.supplierId);
              const underAllocated = selected.items.filter(i => i.qtyAllocated < i.qtyRequired);

              return (
                <>
                  {/* ── SKU ALLOCATION ── */}
                  <SectionHead title="SKU Allocation" />

                  {underAllocated.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Under-allocated</p>
                      {underAllocated.map(i => (
                        <p key={i.skuId} className="text-[10px] text-amber-600">
                          {skuLabel(i.skuId)}: needs {i.qtyRequired - i.qtyAllocated} more units
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{selected.items.length} SKU{selected.items.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => setAddingItem(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">+ Add SKU</button>
                  </div>

                  {addingItem && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                      <select value={addItem.skuId} onChange={e => setAddItem(a => ({ ...a, skuId: e.target.value }))} className={inp}>
                        <option value="">— select SKU —</option>
                        {skus.filter(s => s.status === "active").map(s => (
                          <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={0} value={addItem.qtyRequired}
                          onChange={e => setAddItem(a => ({ ...a, qtyRequired: e.target.value }))}
                          className={inp} placeholder="Qty Required" />
                        <input type="number" min={0} value={addItem.qtyAllocated}
                          onChange={e => setAddItem(a => ({ ...a, qtyAllocated: e.target.value }))}
                          className={inp} placeholder="Qty Allocated" />
                      </div>
                      <p className="text-[10px] text-blue-500">SKU will be automatically added to a linked shipment.</p>
                      <div className="flex gap-2">
                        <button onClick={addLineItem} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">
                          Add & Allocate to Shipment
                        </button>
                        <button onClick={() => setAddingItem(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  )}

                  {selected.items.length === 0 && !addingItem && (
                    <p className="text-xs text-slate-400 py-1">No SKUs yet — add one above</p>
                  )}

                  <div className="space-y-2">
                    {selected.items.map((item, i) => {
                      const sku    = skuOf(item.skuId);
                      const pct    = item.qtyRequired > 0 ? Math.round((item.qtyAllocated / item.qtyRequired) * 100) : 100;
                      const inStk  = stockQty(item.skuId);
                      const skuSup = sku ? supplierOf(sku.supplierId) : null;
                      const barCls = pct >= 100 ? "bg-green-400" : pct > 50 ? "bg-blue-400" : "bg-amber-400";
                      const stkCls = inStk === 0 ? "text-red-500" : inStk < (sku?.minStockLevel ?? 0) ? "text-amber-500" : "text-green-600";
                      return (
                        <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{sku?.name ?? item.skuId}</p>
                              <p className="text-[10px] font-mono text-slate-400">{sku?.code}</p>
                            </div>
                            <button onClick={() => removeItem(i)} className="text-[10px] text-red-400 hover:text-red-600 ml-2 shrink-0">Remove</button>
                          </div>
                          {/* Allocation bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">{item.qtyAllocated}/{item.qtyRequired} ({pct}%)</span>
                          </div>
                          {/* Detail chips */}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                            <span className={`font-medium ${stkCls}`}>{inStk.toLocaleString()} in stock</span>
                            {sku?.unitOfMeasure && <span className="text-slate-400">{sku.unitOfMeasure}</span>}
                            {sku?.costPrice != null && <span className="text-slate-400">£{sku.costPrice.toFixed(2)}/unit</span>}
                            {sku?.weight != null && <span className="text-slate-400">{sku.weight} kg</span>}
                            {sku?.leadTimeDays != null && <span className="text-slate-400">{sku.leadTimeDays}d lead</span>}
                            {skuSup && <span className="text-slate-400">· {skuSup.name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── LINKED SHIPMENTS ── */}
                  <SectionHead title="Linked Shipments" />
                  {projJobs.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl px-4 py-4 text-center border border-slate-100">
                      <p className="text-xs text-slate-400">No shipments linked yet.</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Add a SKU above to auto-create one.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projJobs.map(j => {
                        const totalKg = j.items.reduce((s, it) => s + (skuOf(it.skuId)?.weight ?? 0) * it.qty, 0);
                        return (
                          <button key={j.id} onClick={() => onSelectJob(j)}
                            className="w-full text-left bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl px-3 py-2.5 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono font-bold text-slate-700">{j.ref}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${JOB_DOT[j.status]}`} />
                                {JOB_LBL[j.status]}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mb-1.5">{j.origin} → {j.destination}</p>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {j.items.slice(0, 5).map((it, idx) => {
                                const s = skuOf(it.skuId);
                                return (
                                  <span key={idx} className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5 text-slate-600 font-mono">
                                    {s?.code ?? it.skuId} ×{it.qty}
                                  </span>
                                );
                              })}
                              {j.items.length > 5 && <span className="text-[10px] text-slate-400">+{j.items.length - 5}</span>}
                            </div>
                            <div className="flex gap-3 text-[10px] text-slate-400">
                              {j.driver && <span>{j.driver}</span>}
                              {j.scheduledDate && <span>Sched: {j.scheduledDate}</span>}
                              {totalKg > 0 && <span>{totalKg.toFixed(1)} kg</span>}
                              {j.trackingRef && <span className="font-mono">{j.trackingRef}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── SUPPLIER DETAILS ── */}
                  {sup && (
                    <>
                      <SectionHead title="Supplier" />
                      <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">{sup.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sup.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {sup.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500">
                          {sup.contactName && <span>Contact: {sup.contactName}</span>}
                          {sup.country     && <span>Country: {sup.country}</span>}
                          {sup.email       && <span className="col-span-2">Email: {sup.email}</span>}
                          {sup.phone       && <span>Phone: {sup.phone}</span>}
                          {sup.currency    && <span>Currency: {sup.currency}</span>}
                          {sup.paymentTerms && <span>Terms: {sup.paymentTerms}</span>}
                          {sup.leadTimeDays > 0 && <span>Lead time: {sup.leadTimeDays}d</span>}
                        </div>
                        {sup.locations.filter(l => l.isPrimary).map(loc => (
                          <div key={loc.id} className="mt-1.5 pt-1.5 border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-600 capitalize">{loc.label} · {loc.type}</p>
                            <p className="text-[10px] text-slate-400">
                              {[loc.address, loc.city, loc.postcode, loc.country].filter(Boolean).join(", ")}
                            </p>
                            {loc.phone && <p className="text-[10px] text-slate-400">{loc.phone}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>

          <div className="shrink-0 border-t border-slate-100 px-4 py-3 flex gap-3 bg-white">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg">
              {saving ? "Saving…" : isNew ? "Create Operation" : "Save Changes"}
            </button>
            {!isNew && (
              <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200">
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── INVENTORY TAB ──────────────────────────────────────────────────────────────
function InventoryTab({ skus }: { skus: SKU[] }) {
  const [stock,      setStock]      = useState<StockEntry[]>([]);
  const [search,     setSearch]     = useState("");
  const [filterLoc,  setFilterLoc]  = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState({ skuId: "", location: "", quantity: "", reservedQty: "" });
  const [adjustId,   setAdjustId]   = useState<string | null>(null);
  const [adjustQty,  setAdjustQty]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [historyTab, setHistoryTab] = useState(false);

  const reload = useCallback(async () => {
    const st = await fetch("/api/stock").then(r => r.json());
    setStock(st);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const skuName = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const skuMin  = (id: string) => skus.find(x => x.id === id)?.minStockLevel ?? null;
  const locations = [...new Set(stock.map(s => s.location))].sort();

  const addStock = async () => {
    if (!addForm.skuId || !addForm.location.trim()) { showFlash("SKU and location required", false); return; }
    setSaving(true);
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skuId: addForm.skuId, location: addForm.location, quantity: Number(addForm.quantity) || 0, reservedQty: Number(addForm.reservedQty) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) showFlash(data.error, false);
    else { showFlash("Stock entry saved"); setShowAdd(false); setAddForm({ skuId: "", location: "", quantity: "", reservedQty: "" }); }
    setSaving(false); await reload();
  };

  const adjust = async (id: string) => {
    const qty = Number(adjustQty);
    if (isNaN(qty)) { showFlash("Enter valid quantity", false); return; }
    await fetch(`/api/stock/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: qty }) });
    showFlash("Quantity updated"); setAdjustId(null); setAdjustQty(""); await reload();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this stock entry?")) return;
    await fetch(`/api/stock/${id}`, { method: "DELETE" }); showFlash("Removed"); await reload();
  };

  const statusBadge = (s: StockEntry) => {
    const min = skuMin(s.skuId);
    if (min == null) return null;
    if (s.quantity === 0) return { label: "Out", cls: "bg-red-100 text-red-700" };
    if (s.quantity <= min) return { label: "Low", cls: "bg-amber-100 text-amber-700" };
    return { label: "OK", cls: "bg-green-100 text-green-700" };
  };

  const visible = stock.filter(s => {
    if (filterLoc && s.location !== filterLoc) return false;
    if (search) {
      const q = search.toLowerCase();
      const sku = skus.find(x => x.id === s.skuId);
      if (!sku?.code.toLowerCase().includes(q) && !sku?.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalValue = stock.reduce((sum, s) => sum + (skus.find(k => k.id === s.skuId)?.costPrice ?? 0) * s.quantity, 0);
  const sorted = historyTab ? [...stock].sort((a, b) => (b.lastCountDate ?? "").localeCompare(a.lastCountDate ?? "")) : visible;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {([false, true]).map(h => (
            <button key={String(h)} onClick={() => setHistoryTab(h)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${historyTab === h ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {h ? "History" : "Stock"}
            </button>
          ))}
        </div>
        {!historyTab && (
          <button onClick={() => setShowAdd(v => !v)} className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700">+ Add</button>
        )}
      </div>

      {flash && (
        <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs shrink-0 ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {flash.msg}
        </div>
      )}

      {!historyTab && showAdd && (
        <div className="mx-4 mt-2 bg-blue-50 rounded-xl p-3 space-y-2 shrink-0">
          <p className="text-xs font-semibold text-slate-700">Add / Receive Stock</p>
          <select value={addForm.skuId} onChange={e => setAddForm(f => ({ ...f, skuId: e.target.value }))} className={inp}>
            <option value="">— select SKU —</option>
            {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
          <input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Qty" className={inp} />
            <input type="number" min={0} value={addForm.reservedQty} onChange={e => setAddForm(f => ({ ...f, reservedQty: e.target.value }))} placeholder="Reserved" className={inp} />
          </div>
          <button onClick={addStock} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
            {saving ? "Saving…" : "Add Entry"}
          </button>
        </div>
      )}

      {!historyTab && (
        <div className="flex gap-2 px-4 pt-2 pb-2 shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[130px]">
            <option value="">All locations</option>
            {locations.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {sorted.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-slate-400">{stock.length === 0 ? "No stock entries yet" : "No matches"}</p>
        )}
        {historyTab ? sorted.map(s => {
          const sku   = skus.find(k => k.id === s.skuId);
          const avail = s.quantity - s.reservedQty;
          const st    = statusBadge(s);
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0 w-20 text-center">
                <p className="text-xs font-semibold text-slate-700">{s.lastCountDate ?? "—"}</p>
                <p className="text-[10px] text-slate-400">last count</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-semibold text-slate-700 truncate">{sku?.code ?? s.skuId}</p>
                <p className="text-xs text-slate-400 truncate">{s.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{s.quantity.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{avail} avail</p>
              </div>
              {st
                ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                : <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-green-50 text-green-600">OK</span>}
            </div>
          );
        }) : visible.map(s => {
          const st    = statusBadge(s);
          const avail = s.quantity - s.reservedQty;
          return (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-700 truncate">{skuName(s.skuId)}</p>
                <p className="text-xs text-slate-400">{s.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{s.quantity.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{avail} avail</p>
              </div>
              {st && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${st.cls}`}>{st.label}</span>}
              <div className="shrink-0">
                {adjustId === s.id ? (
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-16 focus:outline-none" />
                    <button onClick={() => adjust(s.id)} className="text-xs text-blue-600 font-medium">✓</button>
                    <button onClick={() => setAdjustId(null)} className="text-xs text-slate-400">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setAdjustId(s.id); setAdjustQty(String(s.quantity)); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Adj</button>
                    <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">
        {stock.length} entries · £{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} value
      </div>
    </div>
  );
}

// ── TRANSITS TAB ───────────────────────────────────────────────────────────────
function TransitsTab({ skus, onSelectJob, onNewJob }: { skus: SKU[]; onSelectJob: (j: TransportJob) => void; onNewJob: () => void }) {
  const [jobs, setJobs] = useState<TransportJob[]>([]);

  useEffect(() => {
    fetch("/api/transport").then(r => r.json()).then(setJobs);
  }, []);

  const totalWeight = (job: TransportJob) =>
    job.items.reduce((s, item) => s + (skus.find(k => k.id === item.skuId)?.weight ?? 0) * item.qty, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
        <div className="flex-1 text-xs font-medium text-slate-500">{jobs.length} transport jobs</div>
        <button onClick={onNewJob} className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700">+ New</button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {jobs.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No transport jobs yet</p>}
        {jobs.map(j => {
          const kg = totalWeight(j);
          return (
            <button key={j.id} onClick={() => onSelectJob(j)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-mono font-semibold text-slate-800">{j.ref}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${JOB_DOT[j.status]}`} />
                  {JOB_LBL[j.status]}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">{j.origin} → {j.destination}</p>
              <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                {j.driver && <span>{j.driver}</span>}
                {j.scheduledDate && <span>{j.scheduledDate}</span>}
                {kg > 0 && <span>{kg.toFixed(1)} kg</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ROOT WORKSPACE PANEL ──────────────────────────────────────────────────────
type WTab = "operations" | "inventory" | "transits";

export default function WorkspacePanel({ onClose, onSelectJob, onNewJob }: Props) {
  const [wTab,      setWTab]      = useState<WTab>("operations");
  const [skus,      setSkus]      = useState<SKU[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [jobs,      setJobs]      = useState<TransportJob[]>([]);
  const [stock,     setStock]     = useState<StockEntry[]>([]);

  const reloadJobs = useCallback(async () => {
    const j = await fetch("/api/transport").then(r => r.json());
    setJobs(j);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/skus").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/transport").then(r => r.json()),
      fetch("/api/stock").then(r => r.json()),
    ]).then(([s, sup, j, st]) => {
      setSkus(s); setSuppliers(sup); setJobs(j); setStock(st);
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Workspace</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {([["operations", "Ops"], ["inventory", "Stock"], ["transits", "Transits"]] as const).map(([t, lbl]) => (
            <button key={t} onClick={() => setWTab(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${wTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {wTab === "operations" && (
          <OperationsTab
            suppliers={suppliers} skus={skus} stock={stock} jobs={jobs}
            onJobsChange={reloadJobs}
            onSelectJob={onSelectJob}
          />
        )}
        {wTab === "inventory" && <InventoryTab skus={skus} />}
        {wTab === "transits"  && <TransitsTab skus={skus} onSelectJob={j => { onSelectJob(j); }} onNewJob={onNewJob} />}
      </div>
    </div>
  );
}
