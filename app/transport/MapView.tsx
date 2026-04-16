"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TransportJob, SKU } from "@/lib/store";
import { geocodePlace, fetchRouteCoords } from "@/lib/geocode";

const STATUS_COLORS: Record<TransportJob["status"], string> = {
  pending: "#f59e0b",
  in_transit: "#3b82f6",
  delivered: "#22c55e",
  cancelled: "#94a3b8",
};

interface RouteEntry {
  jobId: string;
  path: [number, number][];
  origin: [number, number];
  dest: [number, number];
}

/** Flies/zooms the map to a given route when selectedId changes */
function FlyToRoute({ routes, selectedId }: { routes: RouteEntry[]; selectedId: string | null }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || selectedId === prevId.current) return;
    const entry = routes.find(r => r.jobId === selectedId);
    if (!entry || entry.path.length < 2) return;
    prevId.current = selectedId;
    map.fitBounds(entry.path as [number, number][], { padding: [60, 60], maxZoom: 10, animate: true, duration: 0.8 });
  }, [selectedId, routes, map]);

  return null;
}

interface Props {
  jobs: TransportJob[];
  skus: SKU[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MapView({ jobs, skus, selectedId, onSelect }: Props) {
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const toProcess = jobs.filter(j => j.origin && j.destination);
    setPending(toProcess.length);

    (async () => {
      const results: RouteEntry[] = [];
      for (const job of toProcess) {
        const [orig, dest] = await Promise.all([
          geocodePlace(job.origin),
          geocodePlace(job.destination),
        ]);
        if (!alive) return;
        if (!orig || !dest) { setPending(p => p - 1); continue; }
        const path = await fetchRouteCoords(orig, dest);
        if (!alive) return;
        results.push({ jobId: job.id, path, origin: orig, dest });
        setRoutes([...results]); // update progressively
        setPending(p => p - 1);
      }
    })();

    return () => { alive = false; };
  }, [jobs]);

  const totalWeight = (job: TransportJob) =>
    job.items.reduce((s, item) => {
      const sku = skus.find(k => k.id === item.skuId);
      return s + (sku?.weight ?? 0) * item.qty;
    }, 0);

  const itemSummary = (job: TransportJob) =>
    job.items
      .map(item => {
        const sku = skus.find(k => k.id === item.skuId);
        return `${sku?.code ?? "?"} ×${item.qty}`;
      })
      .join(", ") || "No items";

  return (
    <div className="relative w-full h-full">
      {/* loading badge */}
      {pending > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 shadow text-xs text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Plotting {pending} route{pending !== 1 ? "s" : ""}…
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white/95 shadow rounded-lg px-3 py-2 text-xs space-y-1">
        {(["pending", "in_transit", "delivered", "cancelled"] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className="inline-block w-3 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
            <span className="text-slate-600 capitalize">{s.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <MapContainer
        center={[54.2, -2.5]}
        zoom={6}
        style={{ width: "100%", height: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <FlyToRoute routes={routes} selectedId={selectedId} />

        {routes.map(entry => {
          const job = jobs.find(j => j.id === entry.jobId);
          if (!job) return null;
          const color = STATUS_COLORS[job.status];
          const isSelected = selectedId === job.id;
          const kg = totalWeight(job);
          // Line width scales with cargo weight: 2px (0 kg) → 8px (500+ kg)
          const lineWeight = Math.min(8, 2 + Math.sqrt(kg) * 0.3);

          return (
            <React.Fragment key={job.id}>
              {/* route line */}
              <Polyline
                positions={entry.path}
                color={isSelected ? "#1d4ed8" : color}
                weight={isSelected ? lineWeight + 2 : lineWeight}
                opacity={isSelected ? 1 : job.status === "cancelled" ? 0.4 : 0.75}
                dashArray={job.status === "pending" ? "8 5" : undefined}
                eventHandlers={{ click: () => onSelect(job.id) }}
              >
                <Popup>
                  <div className="text-xs space-y-1" style={{ minWidth: 170 }}>
                    <p className="font-bold text-slate-800 font-mono">{job.ref}</p>
                    <p className="text-slate-700">{job.origin} → {job.destination}</p>
                    {job.carrier && <p className="text-slate-500">Carrier: {job.carrier}</p>}
                    {job.scheduledDate && <p className="text-slate-500">ETA: {job.scheduledDate}</p>}
                    {kg > 0 && <p className="text-slate-500">Weight: {kg.toFixed(1)} kg</p>}
                    <p className="text-slate-500">Items: {itemSummary(job)}</p>
                  </div>
                </Popup>
              </Polyline>

              {/* origin dot (filled) */}
              <CircleMarker
                center={entry.origin}
                radius={isSelected ? 7 : 5}
                color="white"
                fillColor={color}
                fillOpacity={1}
                weight={2}
                eventHandlers={{ click: () => onSelect(job.id) }}
              >
                <Popup>
                  <span className="text-xs font-medium">
                    {job.origin}
                    <br />
                    <span className="text-slate-500 font-mono">{job.ref}</span>
                  </span>
                </Popup>
              </CircleMarker>

              {/* destination dot (hollow) */}
              <CircleMarker
                center={entry.dest}
                radius={isSelected ? 8 : 6}
                color={color}
                fillColor="white"
                fillOpacity={1}
                weight={2.5}
                eventHandlers={{ click: () => onSelect(job.id) }}
              >
                <Popup>
                  <span className="text-xs font-medium">
                    {job.destination}
                    <br />
                    <span className="text-slate-500 font-mono">{job.ref}</span>
                  </span>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
