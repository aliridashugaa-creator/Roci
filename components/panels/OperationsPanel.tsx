"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, SKU } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const BLANK = { name:"", description:"", status:"active" as Project["status"], startDate:"", endDate:"", notes:"" };

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>{children}</div>;
}

const STATUS_COLOURS: Record<Project["status"], string> = {
  planning:"bg-slate-100 text-slate-600", active:"bg-green-100 text-green-700",
  completed:"bg-blue-100 text-blue-700", cancelled:"bg-slate-100 text-slate-500", on_hold:"bg-amber-100 text-amber-700",
};

export default function OperationsPanel({ onClose }: { onClose: () => void }) {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [skus,        setSkus]        = useState<SKU[]>([]);
  const [search,      setSearch]      = useState("");
  const [view,        setView]        = useState<"list"|"edit">("list");
  const [tab,         setTab]         = useState<"active"|"history">("active");
  const [selected,    setSelected]    = useState<Project | null>(null);
  const [isNew,       setIsNew]       = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [flash,       setFlash]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [addItem,     setAddItem]     = useState({ skuId:"", qtyRequired:"", qtyAllocated:"" });
  const [addingItem,  setAddingItem]  = useState(false);

  const reload = useCallback(async () => {
    const [p, sk] = await Promise.all([fetch("/api/projects").then(r => r.json()), fetch("/api/skus").then(r => r.json())]);
    setProjects(p); setSkus(sk);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3000); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew  = () => { setIsNew(true); setSelected(null); setForm(BLANK); setView("edit"); };
  const openEdit = (p: Project) => {
    setIsNew(false); setSelected(p);
    setForm({ name:p.name, description:p.description, status:p.status, startDate:p.startDate ?? "", endDate:p.endDate ?? "", notes:p.notes });
    setView("edit");
  };

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name required", false); return; }
    setSaving(true);
    const payload = { ...form, startDate:form.startDate || null, endDate:form.endDate || null };
    const res = isNew
      ? await fetch("/api/projects", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
      : await fetch(`/api/projects/${selected!.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false); await reload(); if (isNew) { setIsNew(false); setSelected(data); } else setSelected(data);
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/projects/${selected.id}`, { method:"DELETE" });
    showFlash(`${selected.name} deleted`); setView("list"); await reload();
  };

  const addLineItem = async () => {
    if (!selected || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const updated: Project = { ...selected, items:[...selected.items, { skuId:addItem.skuId, qtyRequired:Number(addItem.qtyRequired)||0, qtyAllocated:Number(addItem.qtyAllocated)||0 }] };
    const res = await fetch(`/api/projects/${selected.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed", false); return; }
    showFlash("Item added"); setAddItem({ skuId:"", qtyRequired:"", qtyAllocated:"" }); setAddingItem(false);
    await reload(); setSelected(data);
  };

  const removeItem = async (idx: number) => {
    if (!selected) return;
    const updated: Project = { ...selected, items:selected.items.filter((_,i) => i !== idx) };
    const res = await fetch(`/api/projects/${selected.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelected(data); }
  };

  const skuLabel = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };

  const active = projects.filter(p => ["planning","active","on_hold"].includes(p.status));
  const past   = projects.filter(p => ["completed","cancelled"].includes(p.status));

  const visibleList = (tab === "active" ? active : past).filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        {view === "edit" && (
          <button onClick={() => setView("list")} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Operations</p>
          {view === "edit" && <p className="text-sm font-bold text-slate-800 truncate">{isNew ? "New Project" : form.name}</p>}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {(["active","history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t === "active" ? "Active" : "History"}
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

      {view === "list" ? (
        <>
          <div className="px-4 pt-3 pb-2 shrink-0">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {visibleList.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-400">{tab === "active" ? (active.length === 0 ? "No active projects" : "No matches") : "No past operations"}</p>}
            {visibleList.map(p => {
              const alloc = p.items.reduce((s,i) => s + i.qtyAllocated, 0);
              const req   = p.items.reduce((s,i) => s + i.qtyRequired,  0);
              const pct   = req > 0 ? Math.round((alloc / req) * 100) : null;
              return (
                <button key={p.id} onClick={() => openEdit(p)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800 flex-1 truncate">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize shrink-0 ${STATUS_COLOURS[p.status]}`}>{p.status.replace("_"," ")}</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-400 mb-1 truncate">{p.description}</p>}
                  <div className="flex items-center gap-3">
                    {p.endDate && <span className="text-xs text-slate-400">{p.endDate}</span>}
                    {pct != null && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full" style={{ width:`${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{pct}%</span>
                      </div>
                    )}
                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0">{active.length} active · {past.length} past</div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <F label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} className={inp} /></F>
            <F label="Description"><textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>
            <F label="Status">
              <select value={form.status} onChange={e => f("status", e.target.value as Project["status"])} className={inp}>
                <option value="planning">Planning</option><option value="active">Active</option>
                <option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Start Date"><input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} className={inp} /></F>
              <F label="End Date"><input type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} className={inp} /></F>
            </div>
            <F label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></F>

            {!isNew && selected && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SKU Items</p>
                  <button onClick={() => setAddingItem(v => !v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
                </div>
                {addingItem && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
                    <select value={addItem.skuId} onChange={e => setAddItem(a => ({ ...a, skuId:e.target.value }))} className={inp}>
                      <option value="">— select SKU —</option>
                      {skus.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={0} value={addItem.qtyRequired} onChange={e => setAddItem(a => ({ ...a, qtyRequired:e.target.value }))} className={inp} placeholder="Qty Required" />
                      <input type="number" min={0} value={addItem.qtyAllocated} onChange={e => setAddItem(a => ({ ...a, qtyAllocated:e.target.value }))} className={inp} placeholder="Qty Allocated" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addLineItem} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700">Add</button>
                      <button onClick={() => setAddingItem(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                )}
                {selected.items.length === 0 && <p className="text-xs text-slate-400 py-1">No items yet</p>}
                <div className="space-y-1">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{skuLabel(item.skuId)}</p>
                        <p className="text-xs text-slate-400">{item.qtyAllocated} / {item.qtyRequired} allocated</p>
                      </div>
                      <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600 ml-3">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 flex gap-3 bg-white">
            <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg">{saving ? "Saving…" : isNew ? "Create Project" : "Save Changes"}</button>
            {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200">Delete</button>}
          </div>
        </>
      )}
    </div>
  );
}
