import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// A real slippy map (MapLibre GL) using free OpenStreetMap raster tiles.
// No API key or token required. We draw the same civic data the old SVG
// map used, but as proper GeoJSON layers over actual streets.

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const PRIORITY_COLOR = [
  "match",
  ["get", "priority"],
  "CRITICAL", "#ba1a1a",
  "HIGH", "#d97706",
  "MEDIUM", "#1e40af",
  /* other/low */ "#757684",
];

const PRIORITY_RADIUS = [
  "match",
  ["get", "priority"],
  "CRITICAL", 8,
  "HIGH", 6.5,
  "MEDIUM", 5.5,
  4.5,
];

const CLUSTER_COLOR = [
  "match",
  ["get", "top_priority"],
  "CRITICAL", "#ba1a1a",
  "HIGH", "#d97706",
  "#1e40af",
];

// GeoJSON helpers ----------------------------------------------------------

function pointsFC(points) {
  return {
    type: "FeatureCollection",
    features: points
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { ...p, priority: p.priority || "LOW" },
      })),
  };
}

function clustersFC(clusters) {
  return {
    type: "FeatureCollection",
    features: clusters
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: { ...c, count_label: String(c.count) },
      })),
  };
}

function breachesFC(points) {
  return pointsFC(points.filter((p) => p.priority === "CRITICAL"));
}

function fleetFC(fleet) {
  return {
    type: "FeatureCollection",
    features: fleet
      .filter((f) => f.lat != null && f.lng != null)
      .map((f) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.lng, f.lat] },
        properties: { ...f },
      })),
  };
}

// Fit the viewport to whatever data we have.
function boundsOf(all) {
  const coords = all
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => [p.lng, p.lat]);
  if (coords.length === 0) return null;
  const b = new maplibregl.LngLatBounds(coords[0], coords[0]);
  for (const c of coords) b.extend(c);
  return b;
}

const MapLibreCanvas = forwardRef(function MapLibreCanvas(
  { points, clusters, fleet, layers, onSelect },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const didFitRef = useRef(false);
  const resizeObserverRef = useRef(null);

  // Expose imperative controls to the parent (zoom buttons / recenter).
  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    recenter: () => {
      const b = boundsOf([...points, ...clusters, ...fleet]);
      if (b && mapRef.current) mapRef.current.fitBounds(b, { padding: 80, maxZoom: 15 });
    },
  }));

  // Initialise the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [-73.98, 40.73],
      zoom: 10.5,
      attributionControl: { compact: true },
      dragPan: true,
      scrollZoom: true,
      boxZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      keyboard: true,
    });
    mapRef.current = map;

    // Built-in zoom / compass control (also confirms the map is interactive).
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    // The map often mounts before the flex/grid layout settles, leaving the
    // canvas sized wrong (which makes panning feel broken). Re-measure once the
    // container has real dimensions and whenever it resizes.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    resizeObserverRef.current = resizeObserver;

    map.on("load", () => {
      map.resize();
      // --- Sources ---
      map.addSource("heatmap-src", { type: "geojson", data: pointsFC([]) });
      map.addSource("clusters-src", { type: "geojson", data: clustersFC([]) });
      map.addSource("breaches-src", { type: "geojson", data: pointsFC([]) });
      map.addSource("points-src", { type: "geojson", data: pointsFC([]) });
      map.addSource("fleet-src", { type: "geojson", data: fleetFC([]) });

      // --- Heatmap layer ---
      map.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "heatmap-src",
        paint: {
          "heatmap-weight": [
            "interpolate", ["linear"], ["coalesce", ["get", "priority_score"], 40],
            0, 0, 100, 1,
          ],
          "heatmap-intensity": 0.9,
          "heatmap-radius": 42,
          "heatmap-opacity": 0.55,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(134,242,228,0)",
            0.3, "rgba(134,242,228,0.5)",
            0.6, "rgba(217,119,6,0.6)",
            1, "rgba(186,26,26,0.85)",
          ],
        },
      });

      // --- Cluster bubbles ---
      map.addLayer({
        id: "clusters-halo",
        type: "circle",
        source: "clusters-src",
        paint: {
          "circle-color": CLUSTER_COLOR,
          "circle-opacity": 0.16,
          "circle-radius": ["min", 46, ["+", 20, ["*", 2, ["get", "count"]]]],
        },
      });
      map.addLayer({
        id: "clusters-core",
        type: "circle",
        source: "clusters-src",
        paint: {
          "circle-color": CLUSTER_COLOR,
          "circle-opacity": 0.85,
          "circle-radius": ["min", 38, ["+", 12, ["*", 2, ["get", "count"]]]],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "clusters-count",
        type: "symbol",
        source: "clusters-src",
        layout: {
          "text-field": ["get", "count_label"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#fff" },
      });

      // --- SLA breach rings (critical) ---
      map.addLayer({
        id: "breaches-layer",
        type: "circle",
        source: "breaches-src",
        paint: {
          "circle-radius": 18,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ba1a1a",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.9,
        },
      });

      // --- Individual complaint markers ---
      map.addLayer({
        id: "points-layer",
        type: "circle",
        source: "points-src",
        paint: {
          "circle-color": PRIORITY_COLOR,
          "circle-radius": PRIORITY_RADIUS,
          "circle-opacity": 0.9,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.2,
        },
      });

      // --- Fleet markers ---
      map.addLayer({
        id: "fleet-layer",
        type: "circle",
        source: "fleet-src",
        paint: {
          "circle-color": "#006a61",
          "circle-radius": 7,
          "circle-stroke-color": "#89f5e7",
          "circle-stroke-width": 3,
        },
      });

      // Click a complaint marker -> open the inspector.
      const clickHandler = (e) => {
        const feat = e.features?.[0];
        if (feat && onSelectRef.current) onSelectRef.current(feat.properties);
      };
      map.on("click", "points-layer", clickHandler);
      map.on("click", "breaches-layer", clickHandler);
      for (const id of ["points-layer", "breaches-layer", "clusters-core"]) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }

      readyRef.current = true;
      // Push whatever data we already have.
      syncData();
      syncVisibility();
    });

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      didFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a live ref to onSelect so the map's click handler isn't stale.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Push data into the sources whenever it changes.
  const syncData = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource("points-src")?.setData(pointsFC(points));
    map.getSource("heatmap-src")?.setData(pointsFC(points));
    map.getSource("breaches-src")?.setData(breachesFC(points));
    map.getSource("clusters-src")?.setData(clustersFC(clusters));
    map.getSource("fleet-src")?.setData(fleetFC(fleet));

    // Fit to data on first meaningful load.
    if (!didFitRef.current) {
      const b = boundsOf([...points, ...clusters, ...fleet]);
      if (b) {
        map.fitBounds(b, { padding: 80, maxZoom: 15, duration: 0 });
        didFitRef.current = true;
      }
    }
  };

  useEffect(() => {
    syncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, clusters, fleet]);

  // Toggle layer visibility from the parent's layers state.
  const syncVisibility = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const vis = (on) => (on ? "visible" : "none");
    map.setLayoutProperty("points-layer", "visibility", vis(layers.individual));
    map.setLayoutProperty("heatmap-layer", "visibility", vis(layers.heatmap));
    for (const id of ["clusters-halo", "clusters-core", "clusters-count"])
      map.setLayoutProperty(id, "visibility", vis(layers.clusters));
    map.setLayoutProperty("breaches-layer", "visibility", vis(layers.breaches));
    map.setLayoutProperty("fleet-layer", "visibility", vis(layers.fleet));
  };

  useEffect(() => {
    syncVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  return <div ref={containerRef} className="cp-gis-maplibre" />;
});

export default MapLibreCanvas;
