"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TransportJob, SKU } from "@/lib/store";
import { geocodePlace, fetchRouteCoords } from "@/lib/geocode";

// ── constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<TransportJob["status"], string> = {
  pending:    "#f59e0b",
  in_transit: "#3b82f6",
  delivered:  "#22c55e",
  cancelled:  "#94a3b8",
};

// ── helpers ───────────────────────────────────────────────────────────────────
function cargoKg(job: TransportJob, skus: SKU[]) {
  return job.items.reduce((s, item) => {
    const sku = skus.find(k => k.id === item.skuId);
    return s + (sku?.weight ?? 0) * item.qty;
  }, 0);
}

function buildFC(
  routes: RouteEntry[],
  skus: SKU[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes.map(r => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        // GeoJSON wants [lon, lat]
        coordinates: r.path.map(([lat, lon]) => [lon, lat]),
      },
      properties: {
        jobId:    r.job.id,
        color:    STATUS_COLORS[r.job.status],
        width:    Math.min(8, 2.5 + Math.sqrt(cargoKg(r.job, skus)) * 0.28),
        selected: r.job.id === selectedId ? 1 : 0,
      },
    })),
  };
}

/** Pulsing dot marker element */
function makeMarkerEl(color: string, filled: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:14px;height:14px;cursor:pointer";

  // Expanding ring (uses the @keyframes markerPulse in globals.css)
  const ring = document.createElement("div");
  ring.style.cssText = [
    "position:absolute;inset:0;border-radius:50%;",
    `background:${color};`,
    "animation:markerPulse 2.2s ease-out infinite;",
    "transform-origin:center;",
  ].join("");

  // Core dot
  const dot = document.createElement("div");
  dot.style.cssText = [
    "position:absolute;inset:0;border-radius:50%;",
    `background:${filled ? color : "#fff"};`,
    `border:2.5px solid ${color};`,
    `box-shadow:0 0 10px ${color}70, 0 2px 6px rgba(0,0,0,0.25);`,
  ].join("");

  wrap.appendChild(ring);
  wrap.appendChild(dot);
  return wrap;
}

// ── types ─────────────────────────────────────────────────────────────────────
interface RouteEntry {
  job: TransportJob;
  path: [number, number][]; // [lat, lon]
  orig: [number, number];
  dest: [number, number];
}

interface Props {
  jobs: TransportJob[];
  skus: SKU[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function MapView({ jobs, skus, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const loadedRef    = useRef(false);
  const frameRef     = useRef<number>(0);
  const dashRef      = useRef(0);
  const markersRef   = useRef<Record<string, { orig: maplibregl.Marker; dest: maplibregl.Marker }>>({});

  const [routes,  setRoutes]  = useState<RouteEntry[]>([]);
  const [loading, setLoading] = useState(0);

  // ── init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center:  [-2.5, 54.2],
      zoom:    5.5,
      pitch:   0,
      bearing: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    // ── auto-pitch: tilt into 3-D as the user zooms in ──────────────────────
    map.on("zoom", () => {
      const z = map.getZoom();
      const target = z < 11 ? 0 : Math.min(62, (z - 11) * 14);
      if (Math.abs(map.getPitch() - target) > 2) {
        map.easeTo({ pitch: target, duration: 400 });
      }
    });

    map.on("load", () => {
      loadedRef.current = true;

      // ── 3-D building extrusions ────────────────────────────────────────────
      // Interpolate height from 0 → actual at zoom 14–15, fade in opacity
      try {
        map.addLayer({
          id: "3d-buildings",
          source: "carto",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": [
              "interpolate", ["linear"], ["zoom"],
              14, "#dde3ec",
              17, "#8fa3bf",
            ],
            "fill-extrusion-height": [
              "interpolate", ["linear"], ["zoom"],
              13, 0,
              14, ["coalesce", ["get", "render_height"], 12],
            ],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": [
              "interpolate", ["linear"], ["zoom"],
              13, 0,
              15, 0.72,
            ],
          },
        });
      } catch (err) {
        console.warn("3D buildings layer skipped:", err);
      }

      // ── route GeoJSON source ───────────────────────────────────────────────
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Layer 1 – wide, very blurred glow underneath
      map.addLayer({
        id: "routes-glow",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":   ["get", "color"],
          "line-width":   ["*", ["get", "width"], 5],
          "line-opacity": 0.09,
          "line-blur":    10,
        },
      });

      // Layer 2 – solid, semi-transparent base
      map.addLayer({
        id: "routes-base",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":   ["get", "color"],
          "line-width":   ["get", "width"],
          "line-opacity": ["case", ["==", ["get", "selected"], 1], 0.65, 0.40],
        },
      });

      // Layer 3 – fast-moving animated dashes (the "data flow" look)
      map.addLayer({
        id: "routes-flow",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":      ["get", "color"],
          "line-width":      ["*", ["get", "width"], 0.6],
          "line-dasharray":  [2, 2.5],
          // line-dashoffset updated each frame by rAF below
        },
      });

      // Layer 4 – bright highlight for selected route only
      map.addLayer({
        id: "routes-sel",
        type: "line",
        source: "routes",
        filter: ["==", ["get", "selected"], 1],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":   ["get", "color"],
          "line-width":   ["+", ["get", "width"], 3],
          "line-opacity": 0.95,
          "line-blur":    0.5,
        },
      });

      // ── animated dash flow ─────────────────────────────────────────────────
      const tick = () => {
        dashRef.current -= 0.4;
        try {
          map.setPaintProperty("routes-flow", "line-dashoffset", dashRef.current);
        } catch { /* map may be mid-removal */ }
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // ── click / hover on route lines ───────────────────────────────────────
      ["routes-base", "routes-flow", "routes-sel"].forEach(lyr => {
        map.on("click", lyr, e => {
          const id = e.features?.[0]?.properties?.jobId as string | undefined;
          if (id) onSelect(id);
        });
        map.on("mouseenter", lyr, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", lyr, () => { map.getCanvas().style.cursor = ""; });
      });
    });

    return () => {
      loadedRef.current = false;
      cancelAnimationFrame(frameRef.current);
      Object.values(markersRef.current).forEach(m => { m.orig.remove(); m.dest.remove(); });
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, [onSelect]);

  // ── sync GeoJSON source whenever routes / selection / skus change ──────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("routes") as maplibregl.GeoJSONSource | undefined)
      ?.setData(buildFC(routes, skus, selectedId));
  }, [routes, skus, selectedId]);

  // ── geocode + fetch OSRM routes when jobs list changes ─────────────────────
  useEffect(() => {
    let alive = true;

    // Remove all existing markers; we'll rebuild from scratch
    Object.values(markersRef.current).forEach(m => { m.orig.remove(); m.dest.remove(); });
    markersRef.current = {};
    setRoutes([]);

    const todo = jobs.filter(j => j.origin && j.destination);
    setLoading(todo.length);

    (async () => {
      for (const job of todo) {
        if (!alive) return;

        const [orig, dest] = await Promise.all([
          geocodePlace(job.origin),
          geocodePlace(job.destination),
        ]);
        if (!alive) return;
        if (!orig || !dest) { setLoading(c => Math.max(0, c - 1)); continue; }

        const path = await fetchRouteCoords(orig, dest);
        if (!alive) return;

        // Update routes state (append or replace)
        setRoutes(prev => {
          const filtered = prev.filter(r => r.job.id !== job.id);
          return [...filtered, { job, path, orig, dest }];
        });

        // Place pulsing HTML markers
        const map = mapRef.current;
        if (map) {
          const color = STATUS_COLORS[job.status];

          const origEl = makeMarkerEl(color, true);
          origEl.addEventListener("click", () => onSelect(job.id));
          const origM = new maplibregl.Marker({ element: origEl, anchor: "center" })
            .setLngLat([orig[1], orig[0]])
            .setPopup(
              new maplibregl.Popup({ closeButton: false, offset: 12 }).setHTML(
                `<p style="margin:0;font-size:12px;font-weight:700">${job.origin}</p>` +
                `<p style="margin:0;font-size:11px;color:#64748b">${job.ref} · origin</p>`,
              ),
            )
            .addTo(map);

          const destEl = makeMarkerEl(color, false);
          destEl.addEventListener("click", () => onSelect(job.id));
          const destM = new maplibregl.Marker({ element: destEl, anchor: "center" })
            .setLngLat([dest[1], dest[0]])
            .setPopup(
              new maplibregl.Popup({ closeButton: false, offset: 12 }).setHTML(
                `<p style="margin:0;font-size:12px;font-weight:700">${job.destination}</p>` +
                `<p style="margin:0;font-size:11px;color:#64748b">${job.ref} · destination</p>`,
              ),
            )
            .addTo(map);

          markersRef.current[job.id] = { orig: origM, dest: destM };
        }

        setLoading(c => Math.max(0, c - 1));
      }
    })();

    return () => { alive = false; };
  }, [jobs, onSelect]);

  // ── fly + zoom to selected route ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const entry = routes.find(r => r.job.id === selectedId);
    if (!entry || entry.path.length < 2) return;

    const lons = entry.path.map(([, lon]) => lon);
    const lats = entry.path.map(([lat])    => lat);
    map.fitBounds(
      [
        [Math.min(...lons) - 0.15, Math.min(...lats) - 0.15],
        [Math.max(...lons) + 0.15, Math.max(...lats) + 0.15],
      ],
      { padding: 90, maxZoom: 10, duration: 1400, pitch: 35, bearing: 0 },
    );
  }, [selectedId, routes]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {/* loading badge */}
      {loading > 0 && (
        <div className="absolute top-3 right-14 z-10 bg-white/95 shadow text-xs text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
          Plotting {loading} route{loading !== 1 ? "s" : ""}…
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-8 left-3 z-10 bg-white/95 shadow-sm rounded-xl px-3 py-2.5 space-y-1.5 pointer-events-none">
        {(["pending", "in_transit", "delivered", "cancelled"] as const).map(s => (
          <div key={s} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-4 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
            <span className="text-slate-600 capitalize">{s.replace("_", " ")}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400">
          Width = cargo weight · Zoom for 3D
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
