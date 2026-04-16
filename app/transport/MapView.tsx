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

// UK bounding box — prevents infinite panning
const UK_BOUNDS: maplibregl.LngLatBoundsLike = [[-11, 49], [4, 62]];

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
  const hasSelection = selectedId !== null;
  return {
    type: "FeatureCollection",
    features: routes.map(r => {
      const isSelected = r.job.id === selectedId;
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: r.path.map(([lat, lon]) => [lon, lat]),
        },
        properties: {
          jobId:    r.job.id,
          color:    STATUS_COLORS[r.job.status],
          // When something is selected: unselected routes fade right out
          opacity:  hasSelection ? (isSelected ? 1 : 0.08) : 0.55,
          width:    Math.min(8, 2.5 + Math.sqrt(cargoKg(r.job, skus)) * 0.28),
          selected: isSelected ? 1 : 0,
        },
      };
    }),
  };
}

/** Truck SVG marker — filled dot at center with a pulsing ring */
function makeTruckMarker(color: string, isOrigin: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.title = isOrigin ? "Origin" : "Destination";
  wrap.style.cssText = "position:relative;width:22px;height:22px;cursor:pointer";

  // Pulse ring
  const ring = document.createElement("div");
  ring.style.cssText = [
    "position:absolute;inset:0;border-radius:50%;",
    `background:${color};`,
    "animation:markerPulse 2.4s ease-out infinite;",
    "transform-origin:center;",
  ].join("");

  // Truck SVG body
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.style.cssText = "position:absolute;inset:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))";

  if (isOrigin) {
    // Solid truck (origin = loaded)
    svg.innerHTML = `
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="1.5"/>
      <path d="M4 10h10v5H4z" fill="white"/>
      <path d="M14 11.5l3 1.5v2h-3z" fill="white"/>
      <circle cx="6.5" cy="15.5" r="1.2" fill="${color}"/>
      <circle cx="13.5" cy="15.5" r="1.2" fill="${color}"/>
    `;
  } else {
    // Hollow circle (destination = drop-off)
    svg.innerHTML = `
      <circle cx="12" cy="12" r="11" fill="white" stroke="${color}" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="4" fill="${color}"/>
    `;
  }

  wrap.appendChild(ring);
  wrap.appendChild(svg);
  return wrap;
}

// ── types ─────────────────────────────────────────────────────────────────────
interface RouteEntry {
  job: TransportJob;
  path: [number, number][];
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
      minZoom: 5,
      maxZoom: 18,
      pitch:   12,          // slight tilt from the start
      bearing: 0,
      maxBounds: UK_BOUNDS, // no infinite scroll
      renderWorldCopies: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    // ── smooth auto-pitch: fires AFTER zoom animation ends, never fights it ──
    map.on("zoomend", () => {
      const z = map.getZoom();
      const target = z < 10 ? 0 : Math.min(62, (z - 10) * 11);
      // Only move if we're off by more than 3° to avoid micro-jitter
      if (Math.abs(map.getPitch() - target) > 3) {
        map.easeTo({ pitch: target, duration: 700 });
      }
    });

    map.on("load", () => {
      loadedRef.current = true;

      // ── 3-D building extrusions ────────────────────────────────────────────
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
              13, "#dde3ec", 17, "#8fa3bf",
            ],
            "fill-extrusion-height": [
              "interpolate", ["linear"], ["zoom"],
              13, 0,
              14, ["coalesce", ["get", "render_height"], 12],
            ],
            "fill-extrusion-base":    ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": [
              "interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.72,
            ],
          },
        });
      } catch { /* style may not include building data */ }

      // ── route GeoJSON source ───────────────────────────────────────────────
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Layer 1 – wide blurred glow
      map.addLayer({
        id: "routes-glow",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":   ["get", "color"],
          "line-width":   ["*", ["get", "width"], 6],
          "line-opacity": ["*", ["get", "opacity"], 0.18],
          "line-blur":    10,
        },
      });

      // Layer 2 – solid base track
      map.addLayer({
        id: "routes-base",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":   ["get", "color"],
          "line-width":   ["get", "width"],
          "line-opacity": ["get", "opacity"],
        },
      });

      // Layer 3 – animated dashes (data-flow effect)
      map.addLayer({
        id: "routes-flow",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color":     ["get", "color"],
          "line-width":     ["*", ["get", "width"], 0.55],
          "line-opacity":   ["get", "opacity"],
          "line-dasharray": [2, 2.5],
        },
      });

      // Layer 4 – bright highlight for selected route
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
          "line-blur":    0.4,
        },
      });

      // ── animate dashes at 60 fps ───────────────────────────────────────────
      const tick = () => {
        dashRef.current -= 0.38;
        try { map.setPaintProperty("routes-flow", "line-dashoffset", dashRef.current); } catch { /* map may be gone */ }
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // ── click / hover ──────────────────────────────────────────────────────
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

  // ── sync GeoJSON whenever routes / selection / skus change ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("routes") as maplibregl.GeoJSONSource | undefined)
      ?.setData(buildFC(routes, skus, selectedId));
  }, [routes, skus, selectedId]);

  // ── geocode + build routes when jobs list changes ───────────────────────────
  useEffect(() => {
    let alive = true;

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

        setRoutes(prev => [...prev.filter(r => r.job.id !== job.id), { job, path, orig, dest }]);

        // Place truck markers — clicking selects & flies to the route
        const map = mapRef.current;
        if (map) {
          const color = STATUS_COLORS[job.status];

          const origEl = makeTruckMarker(color, true);
          origEl.addEventListener("click", () => onSelect(job.id));
          const origM = new maplibregl.Marker({ element: origEl, anchor: "center" })
            .setLngLat([orig[1], orig[0]])
            .addTo(map);

          const destEl = makeTruckMarker(color, false);
          destEl.addEventListener("click", () => onSelect(job.id));
          const destM = new maplibregl.Marker({ element: destEl, anchor: "center" })
            .setLngLat([dest[1], dest[0]])
            .addTo(map);

          markersRef.current[job.id] = { orig: origM, dest: destM };
        }

        setLoading(c => Math.max(0, c - 1));
      }
    })();

    return () => { alive = false; };
  }, [jobs, onSelect]);

  // ── fly to selected route (called from sidebar click OR marker click) ───────
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
      { padding: 90, maxZoom: 10, duration: 1400, pitch: 30, bearing: 0 },
    );
  }, [selectedId, routes]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
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
          Click a truck or route to select · Width = cargo weight
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
