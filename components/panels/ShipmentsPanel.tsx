"use client";

import type { TransportJob, SKU } from "@/lib/store";

const STATUS_DOT: Record<TransportJob["status"], string> = {
  pending: "bg-amber-400", in_transit: "bg-blue-500",
  delivered: "bg-green-500", cancelled: "bg-slate-400",
};
const STATUS_LABEL: Record<TransportJob["status"], string> = {
  pending: "Pending", in_transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_CLS: Record<TransportJob["status"], string> = {
  pending: "bg-amber-100 text-amber-700", in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-500",
};

interface Props {
  jobs: TransportJob[];
  skus: SKU[];
  selectedJobId: string | null;
  onSelectJob: (job: TransportJob) => void;
  onNewJob: () => void;
  onClose: () => void;
}

export default function ShipmentsPanel({ jobs, skus, selectedJobId, onSelectJob, onNewJob, onClose }: Props) {
  const totalWeight = (job: TransportJob) =>
    job.items.reduce((s, item) => s + (skus.find(k => k.id === item.skuId)?.weight ?? 0) * item.qty, 0);

  // Group by status for summary
  const byStatus = (st: TransportJob["status"]) => jobs.filter(j => j.status === st).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Shipments</p>
          <p className="text-sm font-bold text-slate-800">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onNewJob} className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0">
          + New
        </button>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Status summary pills */}
      <div className="flex gap-1.5 px-4 py-2.5 shrink-0 border-b border-slate-50 flex-wrap">
        {(["in_transit","pending","delivered","cancelled"] as const).map(st => {
          const n = byStatus(st);
          return n > 0 ? (
            <span key={st} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CLS[st]}`}>
              {STATUS_LABEL[st]} {n}
            </span>
          ) : null;
        })}
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {jobs.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-slate-400">No shipments yet — create one to get started</div>
        )}
        {jobs.map(j => {
          const kg     = totalWeight(j);
          const isSel  = selectedJobId === j.id;
          return (
            <button key={j.id} onClick={() => onSelectJob(j)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${isSel ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-mono font-semibold text-slate-800">{j.ref}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[j.status]}`} />
                  {STATUS_LABEL[j.status]}
                </span>
              </div>
              <p className="text-xs text-slate-700 truncate mb-0.5">{j.origin} → {j.destination}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {j.driver && <span>{j.driver}</span>}
                {j.scheduledDate && <span>{j.scheduledDate}</span>}
                {kg > 0 && <span>{kg.toFixed(1)} kg</span>}
                {j.items.length > 0 && <span>{j.items.length} SKU{j.items.length !== 1 ? "s" : ""}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 shrink-0 flex justify-between">
        <span>{jobs.length} jobs total</span>
        <span>{byStatus("in_transit")} in transit · {byStatus("pending")} pending</span>
      </div>
    </div>
  );
}
