import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import MapLibreCanvas from "./MapLibreCanvas";
import { mapService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./CivicIntelligenceMap.css";

// How often to poll the backend so the map reflects new data without a reload.
const REFRESH_MS = 15000;

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

// "12s ago" style relative label for the live-refresh indicator.
function agoLabel(date) {
  if (!date) return "—";
  const secs = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `${mins}m ago`;
}

export default function CivicIntelligenceMap() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [layers, setLayers] = useState({ individual: true, heatmap: true, clusters: true, breaches: true, fleet: true });
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState({ category: "All Categories", priority: "All Priorities", status: "All Statuses" });

  const [points, setPoints] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceTick] = useState(0);

  const mapControls = useRef(null);

  const toggle = (key) => setLayers((v) => ({ ...v, [key]: !v[key] }));
  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicMapToast);
    window.__civicMapToast = window.setTimeout(() => setToast(""), 2200);
  };

  // Turn the current filter selection into backend query params.
  const queryParams = useMemo(
    () => ({
      category: filters.category === "All Categories" ? undefined : filters.category,
      priority: filters.priority === "All Priorities" ? undefined : priorityParam(filters.priority),
      status: filters.status === "All Statuses" ? undefined : statusParam(filters.status),
    }),
    [filters]
  );

  // Single fetch of all three datasets, respecting the active filters.
  const refresh = useMemo(
    () => async () => {
      const [c, f, res] = await Promise.allSettled([
        mapService.clusters(),
        mapService.fleet(),
        mapService.complaints(queryParams),
      ]);
      if (c.status === "fulfilled") setClusters(c.value.clusters || []);
      if (f.status === "fulfilled") setFleet(f.value.fleet || []);
      if (res.status === "fulfilled") setPoints(res.value.points || []);
      else setPoints([]);
      setLastUpdated(new Date());
    },
    [queryParams]
  );

  // Fetch on mount / filter change, then keep polling for live updates.
  // The initial fetch is deferred a tick so state updates land outside the
  // effect body (avoids synchronous cascading renders).
  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) refresh();
    };
    const kickoff = window.setTimeout(run, 0);
    const id = window.setInterval(run, REFRESH_MS);
    return () => {
      active = false;
      window.clearTimeout(kickoff);
      window.clearInterval(id);
    };
  }, [refresh]);

  // Re-render the "x s ago" label every second without refetching.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const criticalCount = points.filter((p) => p.priority === "CRITICAL").length;
  const topCluster = clusters[0];

  const layerRows = useMemo(
    () => [
      ["individual", "Individual Complaints", String(points.length), "primary"],
      ["heatmap", "Heatmap Density", "Active", "secondary"],
      ["clusters", "Issue Clusters", `${clusters.length} zones`, "tertiary"],
      ["breaches", "Critical", `${criticalCount} alert`, "error"],
      ["fleet", "Fleet Telemetry", `${fleet.length} crews`, "fleet"],
    ],
    [points.length, clusters.length, criticalCount, fleet.length]
  );

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const openSelected = () => {
    if (selected?.id) navigate(`/admin/complaints/${selected.id}`);
  };

  return (
    <div className="cp-gis-page">
      <AdminSidebar activeKey="city-map" user={user} onLogout={handleLogout} />
      <div className="cp-gis-shell">
        <header className="cp-gis-header">
          <div className="cp-gis-header-context"><Icon className="cp-gis-primary-icon">tune</Icon><span>Municipal Console</span><b>/</b><strong>Central Operations</strong></div>
          <div className="cp-gis-global-search"><Icon>search</Icon><input placeholder="Search tickets, assets, locations (Press ⌘K)..." /><kbd>⌘K</kbd></div>
          <div className="cp-gis-header-actions">
            <div className="cp-gis-online"><i />Dispatch Pipes Online</div><span className="cp-gis-divider" />
            <button className="cp-gis-icon-btn" onClick={() => notify("3 operational notifications")}><Icon>notifications</Icon><em>3</em></button>
            <div className="cp-gis-profile"><div className="cp-gis-avatar"><Icon>person</Icon></div><div><b>{user?.name || "Municipal User"}</b><span>{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Staff"}</span></div></div>
          </div>
        </header>

        <main className="cp-gis-main">
          <section className="cp-gis-command">
            <div><div className="cp-gis-title-row"><h1>Civic Intelligence Map</h1><span>GIS Live</span></div><p>Explore civic issues geographically with real-time fleet telemetry and density clustering.</p></div>
            <div className="cp-gis-command-actions">
              <div className="cp-gis-stat"><i /><b>{points.length} Active Geo-Tagged Issues</b></div>
              <div className="cp-gis-stat"><Icon>local_shipping</Icon><b>{fleet.length} Crews Online</b></div>
              <button onClick={() => notify("GeoJSON export prepared")}><Icon>file_download</Icon>Export GeoJSON</button>
              <button className="primary" onClick={() => navigate("/admin/complaints")}><Icon>fullscreen</Icon>Complaint Queue</button>
            </div>
          </section>

          <section className="cp-gis-workspace">
            <MapLibreCanvas
              ref={mapControls}
              points={points}
              clusters={clusters}
              fleet={fleet}
              layers={layers}
              onSelect={setSelected}
            />

            <div className="cp-gis-live">
              <span className="cp-gis-live-dot" />
              Live · updated {agoLabel(lastUpdated)}
              <button type="button" onClick={refresh} title="Refresh now">
                <Icon>refresh</Icon>
              </button>
            </div>

            <div className="cp-gis-left-panel">
              <div className="cp-gis-panel">
                <div className="cp-gis-search"><Icon>search</Icon><input placeholder="Search street, coordinate, or asset ID..." /><kbd>⌘K</kbd></div>
                <div className="cp-gis-filter-grid">
                  {Object.entries(filters).map(([key, value]) => (
                    <label key={key}>
                      <span>{key[0].toUpperCase() + key.slice(1)}</span>
                      <select value={value} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
                        {key === "category" && <><option>All Categories</option><option>Street Light</option><option>Water / Drainage</option><option>Pothole</option><option>Garbage / Sanitation</option><option>Traffic Signal</option><option>Parks / Trees</option></>}
                        {key === "priority" && <><option>All Priorities</option><option>Critical Only</option><option>High & Above</option><option>Medium / Low</option></>}
                        {key === "status" && <><option>All Statuses</option><option>New Unassigned</option><option>In Progress</option><option>Resolved</option></>}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="cp-gis-layers"><span className="cp-gis-section-label">Map Layers</span>
                  {layerRows.map(([key, label, count, color]) => (
                    <button key={key} className={`cp-gis-layer ${layers[key] ? "on" : ""}`} onClick={() => toggle(key)}>
                      <span><i className={color} />{label}</span><b>{count}</b>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {topCluster && (
              <div className="cp-gis-cluster-card">
                <div className="cp-gis-card">
                  <div className="cp-gis-cluster-head"><span><i />TOP CLUSTER</span><b>{topCluster.top_priority}</b></div>
                  <h2>{topCluster.dominant_category} hotspot</h2>
                  <div className="cp-gis-chips"><span>{topCluster.count} complaints</span><span>{topCluster.lat.toFixed(3)}, {topCluster.lng.toFixed(3)}</span></div>
                  <div className="cp-gis-detail-grid">
                    <div><small>Dominant Category</small><b>{topCluster.dominant_category}</b></div>
                    <div><small>Top Priority</small><b>{topCluster.top_priority}</b></div>
                    <div><small>Complaints Bundled</small><code>{topCluster.count}</code></div>
                  </div>
                  <button onClick={() => navigate("/admin/complaints")}>View clustered complaints <Icon>arrow_forward</Icon></button>
                </div>
              </div>
            )}

            {selected && (
              <div className="cp-gis-inspector"><div className="cp-gis-card">
                <div className="cp-gis-inspector-head">
                  <div>
                    <div className="cp-gis-ticket"><code>{selected.ticket_id}</code><span>{selected.status?.toUpperCase()}</span></div>
                    <h3>{selected.category}</h3>
                  </div>
                  <button onClick={() => setSelected(null)}><Icon>close</Icon></button>
                </div>
                <div className="cp-gis-meta">
                  <div><small>Priority Level</small><b className="error-dot">● {selected.priority}</b></div>
                  <div><small>Address</small><b>{selected.address || "—"}</b></div>
                  <div><small>Coordinates</small><b>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</b></div>
                </div>
                <div className="cp-gis-inspector-actions">
                  <button onClick={openSelected}><Icon>terminal</Icon>View Operational Command</button>
                </div>
              </div></div>
            )}

            <div className="cp-gis-legend"><span><i className="error" />Critical</span><span><i className="high" />High Priority</span><span><i className="primary" />Med / Low</span><span><i className="ring" />Cluster</span></div>
            <div className="cp-gis-map-controls">
              <div><small>© OpenStreetMap</small><i /></div>
              <section>
                <button onClick={() => mapControls.current?.zoomIn()}><Icon>add</Icon></button>
                <button onClick={() => mapControls.current?.zoomOut()}><Icon>remove</Icon></button>
                <button onClick={() => mapControls.current?.recenter()}><Icon>my_location</Icon></button>
              </section>
            </div>
          </section>
        </main>
      </div>
      {toast && <div className="cp-gis-toast">{toast}</div>}
    </div>
  );
}

// Map UI filter labels to backend query values.
function priorityParam(label) {
  if (label === "Critical Only") return "CRITICAL";
  if (label === "High & Above") return "HIGH";
  if (label === "Medium / Low") return "MEDIUM";
  return undefined;
}

function statusParam(label) {
  if (label === "New Unassigned") return "New";
  if (label === "In Progress") return "In Progress";
  if (label === "Resolved") return "Resolved";
  return undefined;
}
