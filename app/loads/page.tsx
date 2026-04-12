"use client";

import { useEffect, useState, useCallback } from "react";

type LoadStatus =
  | "booked" | "collected" | "in_transit" | "out_for_delivery"
  | "delivered" | "pod_received" | "failed" | "rebooked" | "cancelled";
type PodStatus = "pending" | "chased" | "received";
type LoadSource = "email" | "whatsapp" | "phone" | "manual";

interface EtaUpdate { timestamp: string; eta: string; note: string; }
interface Load {
  id: number;
  reference: string;
  source: LoadSource;
  customer: string;
  origin: string;
  destination: string;
  collectionDate: string;
  eta: string;
  status: LoadStatus;
  subcontractor: string;
  subcontractorRef: string;
  subcontractorReconciled: boolean;
  podStatus: PodStatus;
  podReceivedAt?: string;
  etaUpdates: EtaUpdate[];
  notes: string;
  rebookedFromId?: number;
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: number;
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_FLOW: LoadStatus[] = ["booked", "collected", "in_transit", "out_for_delivery", "delivered", "pod_received"];

const STATUS_LABEL: Record<LoadStatus, string> = {
  booked: "Booked", collected: "Collected", in_transit: "In Transit",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
  pod_received: "POD Received", failed: "Failed", rebooked: "Rebooked", cancelled: "Cancelled",
};

const STATUS_COLOUR: Record<LoadStatus, string> = {
  booked: "bg-slate-100 text-slate-600",
  collected: "bg-blue-100 text-blue-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  pod_received: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  rebooked: "bg-orange-100 text-orange-700",
  cancelled: "bg-slate-100 text-slate-400",
};

const POD_COLOUR: Record<PodStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  chased: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
};

const SOURCE_COLOUR: Record<LoadSource, string> = {
  email: "bg-blue-50 text-blue-600",
  whatsapp: "bg-green-50 text-green-700",
  phone: "bg-purple-50 text-purple-600",
  manual: "bg-slate-100 text-slate-500",
};

function nextStatus(s: LoadStatus): LoadStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i !== -1 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

// ── blank booking form ────────────────────────────────────────────────────────
const BLANK = { source: "email" as LoadSource, customer: "", origin: "", destination: "", collectionDate: "", eta: "", subcontractor: "", subcontractorRef: "", notes: "", reference: "" };

// ── component ────────────────────────────────────────────────────────────────
export default function LoadsPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "failed" | "sub">("all");
  const [showBooking, setShowBooking] = useState(false);
  const [bookingTab, setBookingTab] = useState<"manual" | "paste">("manual");
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  // AI paste state
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  // per-row panel state
  const [etaRow, setEtaRow] = useState<number | null>(null);
  const [etaVal, setEtaVal] = useState("");
  const [etaNote, setEtaNote] = useState("");
  const [rebookRow, setRebookRow] = useState<number | null>(null);
  const [rbDate, setRbDate] = useState("");
  const [rbEta, setRbEta] = useState("");
  const [rbNotes, setRbNotes] = useState("");
  const [working, setWorking] = useState<number | null>(null);

  // audit trail
  const [timelineRow, setTimelineRow] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadData = useCallback(() =>
    fetch(`/api/loads${activeTab !== "all" ? `?filter=${activeTab}` : ""}`)
      .then((r) => r.json()).then(setLoads), [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 4000); };

  // ── AI extraction ────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!pasteText.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/loads/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFlash(`Extraction error: ${data.error}`);
      } else {
        setForm((f) => ({
          ...f,
          customer: data.customer || f.customer,
          origin: data.origin || f.origin,
          destination: data.destination || f.destination,
          collectionDate: data.collectionDate || f.collectionDate,
          eta: data.eta || f.eta,
          subcontractor: data.subcontractor || f.subcontractor,
          subcontractorRef: data.subcontractorRef || f.subcontractorRef,
          notes: data.notes || f.notes,
        }));
        setExtracted(true);
        setBookingTab("manual");
        showFlash("Fields extracted — review and confirm.");
      }
    } finally {
      setExtracting(false);
    }
  };

  // ── book new load ────────────────────────────────────────────────────────
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      showFlash(`${data.reference} booked for ${data.customer}`);
      setForm(BLANK);
      setPasteText("");
      setExtracted(false);
      setShowBooking(false);
      loadData();
    } else {
      showFlash(`Error: ${data.error}`);
    }
    setSaving(false);
  };

  // ── generic patch ────────────────────────────────────────────────────────
  const patch = async (id: number, body: Record<string, unknown>) => {
    setWorking(id);
    const res = await fetch(`/api/loads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) showFlash(`Error: ${data.error}`);
    await loadData();
    setWorking(null);
    return data;
  };

  // ── advance status ───────────────────────────────────────────────────────
  const advanceStatus = (l: Load) => {
    const next = nextStatus(l.status);
    if (next) patch(l.id, { action: "status", status: next });
  };

  const markFailed = (l: Load) => patch(l.id, { action: "status", status: "failed" });

  // ── ETA update ───────────────────────────────────────────────────────────
  const submitEta = async (id: number) => {
    await patch(id, { action: "eta", eta: etaVal, note: etaNote });
    setEtaRow(null); setEtaVal(""); setEtaNote("");
  };

  // ── rebook ───────────────────────────────────────────────────────────────
  const submitRebook = async (id: number) => {
    const data = await patch(id, { action: "rebook", collectionDate: rbDate, eta: rbEta, notes: rbNotes });
    showFlash(`Rebooked as ${data.reference}`);
    setRebookRow(null); setRbDate(""); setRbEta(""); setRbNotes("");
  };

  // ── audit trail ──────────────────────────────────────────────────────────
  const toggleTimeline = async (l: Load) => {
    if (timelineRow === l.id) { setTimelineRow(null); return; }
    setTimelineRow(l.id);
    setTimelineLoading(true);
    const res = await fetch(`/api/loads/${l.id}`);
    const data = await res.json();
    setTimeline(data.timeline ?? []);
    setTimelineLoading(false);
  };

  // ── stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: loads.length,
    active: loads.filter((l) => ["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status)).length,
    podPending: loads.filter((l) => l.status === "delivered" && l.podStatus !== "received").length,
    failed: loads.filter((l) => l.status === "failed").length,
    subPending: loads.filter((l) => l.subcontractor && !l.subcontractorReconciled && ["delivered", "pod_received"].includes(l.status)).length,
  };

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "all", label: "All Loads" },
    { key: "active", label: "Active", count: stats.active },
    { key: "failed", label: "Failed", count: stats.failed },
    { key: "sub", label: "Sub Reconciliation", count: stats.subPending },
  ];

  return (
    <div className="p-8">
      {/* header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Load Management</h2>
          <p className="text-slate-500 text-sm mt-1">Bookings, status tracking, POD chasing and subcontractor reconciliation</p>
        </div>
        <button
          onClick={() => { setShowBooking(!showBooking); setExtracted(false); setPasteText(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showBooking ? "✕ Close" : "+ New Booking"}
        </button>
      </div>

      {/* flash */}
      {flash && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${flash.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {flash}
        </div>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Loads", value: stats.total, colour: "border-slate-300" },
          { label: "Active", value: stats.active, colour: "border-blue-400" },
          { label: "POD Outstanding", value: stats.podPending, colour: stats.podPending > 0 ? "border-amber-400" : "border-slate-300" },
          { label: "Failed", value: stats.failed, colour: stats.failed > 0 ? "border-red-400" : "border-slate-300" },
          { label: "Sub to Reconcile", value: stats.subPending, colour: stats.subPending > 0 ? "border-orange-400" : "border-slate-300" },
        ].map(({ label, value, colour }) => (
          <div key={label} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${colour}`}>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* new booking slide-down */}
      {showBooking && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
          {/* booking tabs */}
          <div className="flex gap-1 mb-5 border-b border-slate-100 pb-4">
            <button
              onClick={() => setBookingTab("manual")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${bookingTab === "manual" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setBookingTab("paste")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${bookingTab === "paste" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              Paste Message
              <span className="text-xs font-normal opacity-70">AI</span>
            </button>
            {extracted && (
              <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                ✓ Fields extracted
              </span>
            )}
          </div>

          {bookingTab === "paste" ? (
            <div>
              <label className="label">Paste email, WhatsApp or any booking message</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"e.g.\nHi, please book collection from ABC Depot, Manchester tomorrow morning to XYZ Ltd in Birmingham. Customer is Acme Corp. Sub is FastFreight (ref FF-4421). ETA next day by noon."}
                rows={7}
                className="input resize-none font-mono text-xs mb-4"
              />
              <button
                onClick={handleExtract}
                disabled={extracting || !pasteText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-2 text-sm transition-colors"
              >
                {extracting ? "Extracting…" : "Extract with AI →"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleBook}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="label">Source</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LoadSource })}
                    className="input">
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Reference (optional)</label>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })}
                    placeholder="Auto-assigned" className="input" />
                </div>
                <div className="col-span-2">
                  <label className="label">Customer</label>
                  <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    placeholder="Customer name" required className="input" />
                </div>
                <div>
                  <label className="label">Origin</label>
                  <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    placeholder="Collection address / DC" required className="input" />
                </div>
                <div>
                  <label className="label">Destination</label>
                  <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="Delivery address" required className="input" />
                </div>
                <div>
                  <label className="label">Collection Date</label>
                  <input type="datetime-local" value={form.collectionDate} onChange={(e) => setForm({ ...form, collectionDate: e.target.value })}
                    required className="input" />
                </div>
                <div>
                  <label className="label">ETA</label>
                  <input type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })}
                    required className="input" />
                </div>
                <div>
                  <label className="label">Subcontractor</label>
                  <input value={form.subcontractor} onChange={(e) => setForm({ ...form, subcontractor: e.target.value })}
                    placeholder="Carrier name (optional)" className="input" />
                </div>
                <div>
                  <label className="label">Sub Reference</label>
                  <input value={form.subcontractorRef} onChange={(e) => setForm({ ...form, subcontractorRef: e.target.value.toUpperCase() })}
                    placeholder="Sub's job ref (optional)" className="input" />
                </div>
                <div className="col-span-2 lg:col-span-4">
                  <label className="label">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any booking notes…" rows={2}
                    className="input resize-none" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-2 text-sm transition-colors">
                {saving ? "Booking…" : "Confirm Booking"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"}`}>
            {label}
            {count != null && count > 0 && (
              <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${activeTab === key ? "bg-blue-500" : "bg-red-100 text-red-600"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* loads table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Src</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Collection / ETA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">POD</th>
                <th className="px-4 py-3">Sub</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loads.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No loads</td></tr>
              )}
              {loads.map((l) => (
                <>
                  <tr key={l.id} className="hover:bg-slate-50 align-top">
                    {/* timeline toggle */}
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggleTimeline(l)}
                        title="View audit trail"
                        className={`text-xs w-5 h-5 rounded transition-colors ${timelineRow === l.id ? "bg-slate-700 text-white" : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"}`}
                      >
                        ≡
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {l.reference}
                      {l.rebookedFromId && (
                        <span className="ml-1 text-xs text-orange-500">↻ {`LOAD-${String(l.rebookedFromId).padStart(3,"0")}`}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${SOURCE_COLOUR[l.source]}`}>
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-[140px] truncate">{l.customer}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px]">
                      <span className="block truncate">{l.origin}</span>
                      <span className="block truncate text-slate-400">→ {l.destination}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                      <span className="block">{fmt(l.collectionDate)}</span>
                      <span className="block text-slate-400">ETA {fmt(l.eta)}</span>
                      {l.etaUpdates.length > 0 && (
                        <span className="text-amber-500 text-xs">↻ updated {l.etaUpdates.length}×</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_COLOUR[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${POD_COLOUR[l.podStatus]}`}>
                        {l.podStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[100px]">
                      {l.subcontractor ? (
                        <span className={l.subcontractorReconciled ? "line-through text-slate-300" : ""}>
                          {l.subcontractor}
                          {l.subcontractorRef && <span className="block font-mono text-slate-400">{l.subcontractorRef}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {nextStatus(l.status) && (
                          <ActionBtn onClick={() => advanceStatus(l)} disabled={working === l.id} colour="blue">
                            {STATUS_LABEL[nextStatus(l.status)!]} ▶
                          </ActionBtn>
                        )}
                        {["in_transit", "out_for_delivery", "collected"].includes(l.status) && (
                          <ActionBtn onClick={() => markFailed(l)} disabled={working === l.id} colour="red">
                            Failed
                          </ActionBtn>
                        )}
                        {["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status) && (
                          <ActionBtn onClick={() => { setEtaRow(etaRow === l.id ? null : l.id); setEtaVal(""); setEtaNote(""); }} colour="amber">
                            ETA ✏
                          </ActionBtn>
                        )}
                        {l.status === "delivered" && l.podStatus === "pending" && (
                          <ActionBtn onClick={() => patch(l.id, { action: "pod_chase" })} disabled={working === l.id} colour="orange">
                            Chase POD
                          </ActionBtn>
                        )}
                        {l.status === "delivered" && l.podStatus !== "received" && (
                          <ActionBtn onClick={() => patch(l.id, { action: "pod_received" })} disabled={working === l.id} colour="green">
                            POD In
                          </ActionBtn>
                        )}
                        {l.status === "failed" && (
                          <ActionBtn onClick={() => { setRebookRow(rebookRow === l.id ? null : l.id); setRbDate(""); setRbEta(""); setRbNotes(""); }} colour="purple">
                            Rebook
                          </ActionBtn>
                        )}
                        {l.subcontractor && !l.subcontractorReconciled && ["delivered", "pod_received"].includes(l.status) && (
                          <ActionBtn onClick={() => patch(l.id, { action: "reconcile" })} disabled={working === l.id} colour="teal">
                            Reconcile ✓
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Audit trail panel */}
                  {timelineRow === l.id && (
                    <tr key={`tl-${l.id}`}>
                      <td colSpan={10} className="px-6 pb-3 pt-0">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Audit Trail — {l.reference}
                          </p>
                          {timelineLoading ? (
                            <p className="text-xs text-slate-400">Loading…</p>
                          ) : timeline.length === 0 ? (
                            <p className="text-xs text-slate-400">No events recorded yet.</p>
                          ) : (
                            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                              {timeline.map((t) => (
                                <li key={t.id} className="ml-4">
                                  <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
                                  <p className="text-xs text-slate-400 font-mono">{fmtTs(t.timestamp)}</p>
                                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{t.event}</p>
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    {Object.entries(t.details).filter(([k]) => k !== "reference").map(([k, v]) => `${k}: ${v}`).join(" · ")}
                                  </p>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* ETA inline panel */}
                  {etaRow === l.id && (
                    <tr key={`eta-${l.id}`}>
                      <td colSpan={10} className="px-4 pb-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="label text-amber-700">New ETA</label>
                            <input type="datetime-local" value={etaVal} onChange={(e) => setEtaVal(e.target.value)} className="input w-52" />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="label text-amber-700">Reason / Note</label>
                            <input value={etaNote} onChange={(e) => setEtaNote(e.target.value)} placeholder="e.g. Traffic on M6" className="input" />
                          </div>
                          <button onClick={() => submitEta(l.id)} disabled={!etaVal}
                            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                            Update ETA
                          </button>
                          <button onClick={() => setEtaRow(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Rebook inline panel */}
                  {rebookRow === l.id && (
                    <tr key={`rb-${l.id}`}>
                      <td colSpan={10} className="px-4 pb-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="label text-purple-700">New Collection Date</label>
                            <input type="datetime-local" value={rbDate} onChange={(e) => setRbDate(e.target.value)} className="input w-52" />
                          </div>
                          <div>
                            <label className="label text-purple-700">New ETA</label>
                            <input type="datetime-local" value={rbEta} onChange={(e) => setRbEta(e.target.value)} className="input w-52" />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="label text-purple-700">Notes</label>
                            <input value={rbNotes} onChange={(e) => setRbNotes(e.target.value)} placeholder="Reason for rebooking…" className="input" />
                          </div>
                          <button onClick={() => submitRebook(l.id)} disabled={!rbDate || !rbEta}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                            Confirm Rebook
                          </button>
                          <button onClick={() => setRebookRow(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── small reusable action button ─────────────────────────────────────────────
const COLOURS = {
  blue:   "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
  red:    "text-red-500 hover:text-red-700 hover:bg-red-50",
  amber:  "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
  orange: "text-orange-500 hover:text-orange-700 hover:bg-orange-50",
  green:  "text-green-600 hover:text-green-800 hover:bg-green-50",
  purple: "text-purple-600 hover:text-purple-800 hover:bg-purple-50",
  teal:   "text-teal-600 hover:text-teal-800 hover:bg-teal-50",
};

function ActionBtn({ children, onClick, disabled, colour }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  colour: keyof typeof COLOURS;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-40 whitespace-nowrap ${COLOURS[colour]}`}
    >
      {children}
    </button>
  );
}
