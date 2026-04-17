"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, SKU } from "@/lib/store";

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const BLANK = { name: "", description: "", status: "active" as Project["status"], startDate: "", endDate: "", notes: "" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const STATUS_COLOURS: Record<Project["status"], string> = {
  planning:  "bg-slate-100 text-slate-600",
  active:    "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
  on_hold:   "bg-amber-100 text-amber-700",
};

const ACTIVE_STATUSES: Project["status"][] = ["planning", "active", "on_hold"];
const PAST_STATUSES:   Project["status"][] = ["completed", "cancelled"];

export default function ProjectsPage() {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [skus,        setSkus]        = useState<SKU[]>([]);
  const [selected,    setSelected]    = useState<Project | null>(null);
  const [isNew,       setIsNew]       = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [flash,       setFlash]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [addItem,     setAddItem]     = useState({ skuId: "", qtyRequired: "", qtyAllocated: "" });
  const [addingItem,  setAddingItem]  = useState(false);
  const [tab,         setTab]         = useState<"active" | "history">("active");

  const reload = useCallback(async () => {
    const [p, sk] = await Promise.all([fetch("/api/projects").then(r => r.json()), fetch("/api/skus").then(r => r.json())]);
    setProjects(p); setSkus(sk);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showFlash = (msg: string, ok = true) => { setFlash({ msg, ok }); setTimeout(() => setFlash(null), 3500); };
  const f = (k: keyof typeof BLANK, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setIsNew(true); setSelected(null); setForm(BLANK); };
  const openEdit = (p: Project) => {
    setIsNew(false); setSelected(p);
    setForm({ name: p.name, description: p.description, status: p.status, startDate: p.startDate ?? "", endDate: p.endDate ?? "", notes: p.notes });
  };

  const save = async () => {
    if (!form.name.trim()) { showFlash("Name is required", false); return; }
    setSaving(true);
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
    const res = isNew
      ? await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/projects/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Save failed", false); setSaving(false); return; }
    showFlash(isNew ? `${data.name} created` : `${data.name} saved`);
    setSaving(false); await reload();
    if (isNew) { setIsNew(false); setSelected(data); }
    else setSelected(data);
  };

  const del = async () => {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return;
    await fetch(`/api/projects/${selected.id}`, { method: "DELETE" });
    showFlash(`${selected.name} deleted`);
    setSelected(null); setIsNew(false); await reload();
  };

  const addLineItem = async () => {
    if (!selected || !addItem.skuId) { showFlash("Select a SKU", false); return; }
    const updated: Project = {
      ...selected,
      items: [...selected.items, { skuId: addItem.skuId, qtyRequired: Number(addItem.qtyRequired) || 0, qtyAllocated: Number(addItem.qtyAllocated) || 0 }],
    };
    const res = await fetch(`/api/projects/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (!res.ok) { showFlash(data.error ?? "Failed to add item", false); return; }
    showFlash("Item added"); setAddItem({ skuId: "", qtyRequired: "", qtyAllocated: "" }); setAddingItem(false);
    await reload(); setSelected(data);
  };

  const removeItem = async (idx: number) => {
    if (!selected) return;
    const updated: Project = { ...selected, items: selected.items.filter((_, i) => i !== idx) };
    const res = await fetch(`/api/projects/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (res.ok) { showFlash("Item removed"); await reload(); setSelected(data); }
  };

  const skuLabel = (id: string) => { const s = skus.find(x => x.id === id); return s ? `${s.code} · ${s.name}` : id; };
  const panelOpen = selected !== null || isNew;

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.includes(p.status));
  const pastProjects   = projects.filter(p => PAST_STATUSES.includes(p.status));

  const visible = activeProjects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex-wrap">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Operations</h2>
            <p className="text-xs text-slate-400">{activeProjects.length} active · {pastProjects.length} past</p>
          </div>
          {/* tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(["active", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "active" ? "Active" : "History"}
              </button>
            ))}
          </div>
          {tab === "active" && <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All active</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
            <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">+ New Project</button>
          </>}
        </div>

        {flash && <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm ${flash.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{flash.msg}</div>}

        {tab === "active" ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3 text-right">Allocation</th>
                  <th className="px-4 py-3 text-right">SKU Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {activeProjects.length === 0 ? "No active projects — check History for past operations" : "No matches"}
                  </td></tr>
                )}
                {visible.map(p => {
                  const allocated = p.items.reduce((s, i) => s + i.qtyAllocated, 0);
                  const required  = p.items.reduce((s, i) => s + i.qtyRequired,  0);
                  const pct = required > 0 ? Math.round((allocated / required) * 100) : null;
                  return (
                    <tr key={p.id} onClick={() => openEdit(p)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === p.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLOURS[p.status]}`}>{p.status.replace("_", " ")}</span></td>
                      <td className="px-4 py-3 text-slate-500">{p.startDate ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{p.endDate ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {pct != null && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{pct}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right"><span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">{p.items.length}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── History tab ── */
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {pastProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No completed or cancelled operations yet</div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Past Operations</p>
                <div className="space-y-3">
                  {pastProjects.map(p => {
                    const allocated = p.items.reduce((s, i) => s + i.qtyAllocated, 0);
                    const required  = p.items.reduce((s, i) => s + i.qtyRequired,  0);
                    const pct = required > 0 ? Math.round((allocated / required) * 100) : 100;
                    return (
                      <div key={p.id}
                        className={`bg-white rounded-xl border shadow-sm px-5 py-4 cursor-pointer hover:border-blue-200 transition-colors ${selected?.id === p.id ? "border-blue-300 bg-blue-50" : "border-slate-100"}`}
                        onClick={() => openEdit(p)}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${STATUS_COLOURS[p.status]}`}>{p.status}</span>
                            </div>
                            {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            {p.startDate && <p className="text-xs text-slate-400">{p.startDate} → {p.endDate ?? "open"}</p>}
                            <p className="text-xs text-slate-400">{p.items.length} SKU{p.items.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        {required > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Allocation at close</span>
                              <span className="font-medium">{allocated} / {required} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p.status === "completed" ? "bg-blue-400" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        {p.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.items.map((item, i) => {
                              const sku = skus.find(s => s.id === item.skuId);
                              return (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                                  {sku?.code ?? item.skuId} ×{item.qtyRequired}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* All projects summary */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">All Operations Summary</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(["planning","active","on_hold","completed","cancelled"] as Project["status"][]).map(s => {
                  const count = projects.filter(p => p.status === s).length;
                  return (
                    <div key={s} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-slate-800">{count}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize mt-1 inline-block ${STATUS_COLOURS[s]}`}>{s.replace("_"," ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="w-[460px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{isNew ? "New Project" : "Edit Project"}</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{isNew ? "—" : form.name}</p>
            </div>
            <button onClick={() => { setSelected(null); setIsNew(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Field label="Name *"><input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Project name" className={inp} /></Field>
            <Field label="Description"><textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={e => f("status", e.target.value as Project["status"])} className={inp}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date"><input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} className={inp} /></Field>
              <Field label="End Date"><input type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} className={inp} /></Field>
            </div>
            <Field label="Notes"><textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></Field>

            {!isNew && selected && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SKU Line Items</p>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Qty Required</label>
                        <input type="number" min={0} value={addItem.qtyRequired} onChange={e => setAddItem(a => ({ ...a, qtyRequired: e.target.value }))} className={inp} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Qty Allocated</label>
                        <input type="number" min={0} value={addItem.qtyAllocated} onChange={e => setAddItem(a => ({ ...a, qtyAllocated: e.target.value }))} className={inp} placeholder="0" />
                      </div>
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
                        <p className="text-xs text-slate-400">{item.qtyAllocated} / {item.qtyRequired} allocated</p>
                      </div>
                      <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600 ml-3">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">{saving ? "Saving…" : isNew ? "Create Project" : "Save Changes"}</button>
            {!isNew && <button onClick={del} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
}
