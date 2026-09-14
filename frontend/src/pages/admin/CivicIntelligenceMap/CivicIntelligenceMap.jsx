import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import "./CivicIntelligenceMap.css";

const MARKERS = [
  { x: 510, y: 280, type: "critical", label: "Critical civic issue" },
  { x: 730, y: 620, type: "critical", label: "Critical civic issue" },
  { x: 1080, y: 260, type: "critical", label: "Critical civic issue" },
  { x: 280, y: 220, type: "high" }, { x: 340, y: 380, type: "high" },
  { x: 890, y: 460, type: "high" }, { x: 610, y: 740, type: "high" },
  { x: 1210, y: 310, type: "high" }, { x: 1030, y: 180, type: "high" },
  { x: 210, y: 190, type: "medium" }, { x: 410, y: 180, type: "medium" },
  { x: 470, y: 320, type: "medium" }, { x: 760, y: 260, type: "medium" },
  { x: 1160, y: 220, type: "medium" }, { x: 1290, y: 390, type: "low" },
  { x: 680, y: 790, type: "low" }, { x: 840, y: 690, type: "low" },
];

const clusters = [
  { id: 1, x: 860, y: 310, count: 9, type: "primary" },
  { id: 2, x: 560, y: 680, count: 18, type: "secondary" },
  { id: 3, x: 390, y: 310, count: 11, type: "error" },
];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function MapSvg({ showIndividual, showHeatmap, showClusters, showBreaches, showFleet, zoom }) {
  const scale = zoom / 100;
  return (
    <svg className="cp-gis-map-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
      style={{ transform: `scale(${scale})` }}>
      <defs>
        <linearGradient id="gisLand" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f8faff" /><stop offset="50%" stopColor="#f2f5fd" /><stop offset="100%" stopColor="#ebf0fa" />
        </linearGradient>
        <radialGradient id="ward12Heat"><stop offset="0%" stopColor="#ba1a1a" stopOpacity=".48" /><stop offset="35%" stopColor="#d97706" stopOpacity=".32" /><stop offset="70%" stopColor="#86f2e4" stopOpacity=".18" /><stop offset="100%" stopColor="#eaedff" stopOpacity="0" /></radialGradient>
        <radialGradient id="corridorHeat"><stop offset="0%" stopColor="#006a61" stopOpacity=".40" /><stop offset="45%" stopColor="#1e40af" stopOpacity=".22" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <pattern id="gisGrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="#dbe2f5" strokeOpacity=".55" strokeWidth=".8"/></pattern>
        <pattern id="subGrid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0L0 0 0 12" fill="none" stroke="#e8edfa" strokeWidth=".35"/></pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gisLand)" />
      <rect width="100%" height="100%" fill="url(#subGrid)" />
      <rect width="100%" height="100%" fill="url(#gisGrid)" />
      <path d="M-50 620C220 640 380 510 620 490C860 470 1020 580 1280 530C1460 490 1580 360 1700 340L1700 430C1580 450 1460 570 1280 610C1020 660 860 550 620 570C380 590 220 720-50 700Z" fill="#dae8fc" opacity=".85"/>
      <path d="M-50 660C220 680 380 550 620 530C860 510 1020 620 1280 570C1460 530 1580 400 1700 380" fill="none" stroke="#b4c5ff" strokeDasharray="8 6" strokeWidth="3" opacity=".6"/>
      <polygon fill="#eaedff" fillOpacity=".35" points="120,80 640,110 710,420 380,460 160,390" stroke="#3755c3" strokeDasharray="6 4" strokeWidth="1.5"/>
      <text fill="#1e40af" fontFamily="Geist" fontSize="13" fontWeight="700" letterSpacing=".08em" opacity=".75" x="240" y="160">WARD 04 · CENTRAL CIVIC CORE</text>
      <polygon fill="#f2f3ff" fillOpacity=".25" points="760,60 1340,90 1480,360 1140,460 740,360" stroke="#757684" strokeDasharray="4 4" strokeWidth="1.2"/>
      <text fill="#444653" fontFamily="Geist" fontSize="13" fontWeight="700" letterSpacing=".08em" opacity=".7" x="960" y="140">WARD 08 · PERIMETER EAST</text>
      <polygon fill="#ffdad6" fillOpacity=".22" points="340,490 820,440 920,820 460,860" stroke="#ba1a1a" strokeDasharray="8 3" strokeWidth="1.8"/>
      <text fill="#ba1a1a" fontFamily="Geist" fontSize="13" fontWeight="700" letterSpacing=".08em" opacity=".85" x="520" y="720">WARD 12 · SOUTH INDUSTRIAL SECTOR</text>
      {showHeatmap && <>
        <circle cx="680" cy="580" fill="url(#ward12Heat)" r="190"/>
        <circle cx="820" cy="310" fill="url(#corridorHeat)" r="140"/>
        <circle cx="940" cy="300" fill="url(#ward12Heat)" opacity=".8" r="110"/>
      </>}
      <line opacity=".9" stroke="#c4c5d5" strokeWidth="8" x1="0" x2="1600" y1="130" y2="150"/>
      <line stroke="#fff" strokeWidth="4" x1="0" x2="1600" y1="130" y2="150"/>
      <text fill="#757684" fontFamily="Geist" fontSize="10" fontWeight="600" letterSpacing=".05em" x="40" y="122">NORTH PERIMETER HWY (STATE RT 9)</text>
      <path d="M520-20L580 380L610 640L660 920" stroke="#c4c5d5" strokeWidth="7"/>
      <path d="M520-20L580 380L610 640L660 920" stroke="#fff" strokeWidth="3.5"/>
      <text fill="#444653" fontFamily="Geist" fontSize="10" fontWeight="600" transform="rotate(78 625 440)" x="625" y="440">CENTRAL MARKET AVE</text>
      <circle cx="820" cy="420" r="320" fill="none" stroke="#dae2fd" strokeWidth="9"/>
      <circle cx="820" cy="420" r="320" fill="none" stroke="#fff" strokeWidth="4.5"/>
      <text fill="#00288e" fontFamily="Geist" fontSize="10" fontWeight="600" textAnchor="middle" x="820" y="94">GREATER INNER RING CORRIDOR</text>
      <g opacity=".95" stroke="#fff" strokeWidth="2.5">
        <line x1="180" x2="180" y1="90" y2="440"/><line x1="320" x2="320" y1="90" y2="480"/><line x1="440" x2="440" y1="100" y2="460"/>
        <line x1="100" x2="560" y1="240" y2="250"/><line x1="120" x2="580" y1="340" y2="350"/>
        <line x1="900" x2="1280" y1="140" y2="420"/><line x1="1100" x2="940" y1="140" y2="480"/>
        <line x1="780" x2="1420" y1="220" y2="250"/><line x1="720" x2="1380" y1="360" y2="370"/>
        <line x1="420" x2="980" y1="580" y2="590"/><line x1="440" x2="900" y1="720" y2="730"/><line x1="740" x2="770" y1="460" y2="880"/>
      </g>
      {showIndividual && MARKERS.map((m, i) => m.type === "critical" ? (
        <g key={i}><circle cx={m.x} cy={m.y} r="14" fill="#ba1a1a" opacity=".25" className="cp-svg-ping"/><circle cx={m.x} cy={m.y} r="5" fill="#ba1a1a"/></g>
      ) : <circle key={i} cx={m.x} cy={m.y} r={m.type === "high" ? 4.5 : 3.5} fill={m.type === "high" ? "#d97706" : m.type === "medium" ? "#1e40af" : "#757684"} opacity={m.type === "low" ? ".75" : ".85"}/>)}
      {showClusters && clusters.map(c => (
        <g key={c.id} className="cp-svg-cluster">
          <circle cx={c.x} cy={c.y} r={c.count === 18 ? 34 : c.count === 11 ? 26 : 28} fill={c.type === "primary" ? "#1e40af" : c.type === "secondary" ? "#006a61" : "#ba1a1a"} opacity=".16"/>
          <circle cx={c.x} cy={c.y} r={c.count === 18 ? 24 : c.count === 11 ? 18 : 20} fill={c.type === "primary" ? "#1e40af" : c.type === "secondary" ? "#006a61" : "#ba1a1a"} opacity=".3"/>
          <circle cx={c.x} cy={c.y} r={c.count === 18 ? 16 : c.count === 11 ? 13 : 14} fill={c.type === "primary" ? "#00288e" : c.type === "secondary" ? "#006a61" : "#ba1a1a"}/>
          <text fill="#fff" fontFamily="Geist" fontSize="10" fontWeight="700" textAnchor="middle" x={c.x} y={c.y + 4}>{c.count}</text>
          {c.id === 1 && <circle cx={c.x} cy={c.y} r="32" fill="none" stroke="#1e40af" strokeDasharray="4 3" strokeWidth="1.5" className="cp-svg-spin"/>}
        </g>
      ))}
      {showFleet && <>
        <g transform="translate(930 260)"><rect x="-14" y="-12" width="28" height="24" rx="4" fill="#fff" stroke="#89f5e7" strokeWidth="1.5"/><text x="0" y="5" textAnchor="middle" fill="#006a61" fontSize="16">⚡</text></g>
        <g transform="translate(630 620)"><rect x="-14" y="-12" width="28" height="24" rx="4" fill="#fff" stroke="#86f2e4" strokeWidth="1.5"/><text x="0" y="5" textAnchor="middle" fill="#006f66" fontSize="16">💧</text></g>
      </>}
      {showBreaches && <g><circle cx="730" cy="620" r="22" fill="none" stroke="#ba1a1a" strokeWidth="2" strokeDasharray="3 3"/></g>}
    </svg>
  );
}

export default function CivicIntelligenceMap() {
  const [layers, setLayers] = useState({ individual: true, heatmap: true, clusters: true, breaches: true, fleet: true });
  const [zoom, setZoom] = useState(100);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState({ category: "Streetlights (212)", priority: "High & Above", status: "In Progress", date: "Last 30 Days" });

  const toggle = key => setLayers(v => ({ ...v, [key]: !v[key] }));
  const notify = message => { setToast(message); window.clearTimeout(window.__civicMapToast); window.__civicMapToast = window.setTimeout(() => setToast(""), 2200); };

  const layerRows = useMemo(() => [
    ["individual", "Individual Complaints", "684", "primary"],
    ["heatmap", "Heatmap Density", "Active", "secondary"],
    ["clusters", "Issue Clusters", "14 zones", "tertiary"],
    ["breaches", "SLA Breaches", "27 alert", "error"],
    ["fleet", "Fleet Telemetry", "14 trucks", "fleet"],
  ], []);

  return (
    <div className="cp-gis-page">
      <AdminSidebar activeKey="city-map" onLogout={() => notify("Sign out action selected.")} />
      <div className="cp-gis-shell">
        <header className="cp-gis-header">
          <div className="cp-gis-header-context"><Icon className="cp-gis-primary-icon">tune</Icon><span>Municipal Console</span><b>/</b><strong>Ward 4 Central Operations</strong></div>
          <div className="cp-gis-global-search"><Icon>search</Icon><input placeholder="Search tickets, assets, locations (Press ⌘K)..." /><kbd>⌘K</kbd></div>
          <div className="cp-gis-header-actions">
            <div className="cp-gis-online"><i />Dispatch Pipes Online</div><span className="cp-gis-divider" />
            <button className="cp-gis-icon-btn" onClick={() => notify("3 operational notifications")}><Icon>notifications</Icon><em>3</em></button>
            <div className="cp-gis-profile"><div className="cp-gis-avatar"><Icon>person</Icon></div><div><b>Rahul Sharma</b><span>Senior Dispatcher</span></div></div>
          </div>
        </header>

        <main className="cp-gis-main">
          <section className="cp-gis-command">
            <div><div className="cp-gis-title-row"><h1>Civic Intelligence Map</h1><span>GIS Live v4.12</span></div><p>Explore civic issues geographically with real-time fleet telemetry and density clustering.</p></div>
            <div className="cp-gis-command-actions">
              <div className="cp-gis-stat"><i /><b>684 Active Geo-Tagged Issues</b></div>
              <div className="cp-gis-stat"><Icon>local_shipping</Icon><b>14/18 Crews Online</b></div>
              <button onClick={() => notify("GeoJSON export prepared")}><Icon>file_download</Icon>Export GeoJSON</button>
              <button className="primary" onClick={() => notify("Full GIS View activated")}><Icon>fullscreen</Icon>Full GIS View</button>
            </div>
          </section>

          <section className="cp-gis-workspace">
            <MapSvg {...{ zoom}} showIndividual={layers.individual} showHeatmap={layers.heatmap} showClusters={layers.clusters} showBreaches={layers.breaches} showFleet={layers.fleet} />

            <div className="cp-gis-left-panel">
              <div className="cp-gis-panel">
                <div className="cp-gis-search"><Icon>search</Icon><input placeholder="Search street, coordinate, or asset ID..." /><kbd>⌘K</kbd></div>
                <div className="cp-gis-filter-grid">
                  {Object.entries(filters).map(([key, value]) => <label key={key}><span>{key === "date" ? "Date Scope" : key[0].toUpperCase() + key.slice(1)}</span><select value={value} onChange={e => setFilters(f => ({...f, [key]: e.target.value}))}>
                    {key === "category" && <><option>All Categories</option><option>Streetlights (212)</option><option>Water Bureau (184)</option><option>Roads & Asphalt (148)</option><option>Sanitation & Waste (140)</option></>}
                    {key === "priority" && <><option>All Priorities</option><option>Critical Only</option><option>High & Above</option><option>Medium / Low</option></>}
                    {key === "status" && <><option>All Statuses</option><option>New Unassigned</option><option>In Progress</option><option>Resolved</option></>}
                    {key === "date" && <><option>Last 24 Hours</option><option>Last 7 Days</option><option>Last 30 Days</option><option>Year-to-Date</option></>}
                  </select></label>)}
                </div>
                <div className="cp-gis-layers"><span className="cp-gis-section-label">Map Layers</span>
                  {layerRows.map(([key, label, count, color]) => <button key={key} className={`cp-gis-layer ${layers[key] ? "on" : ""}`} onClick={() => toggle(key)}>
                    <span><i className={color}/>{label}</span><b>{count}</b>
                  </button>)}
                </div>
              </div>
            </div>

            <div className="cp-gis-cluster-card">
              <div className="cp-gis-card">
                <div className="cp-gis-cluster-head"><span><i />CLUSTER FOCUS #09</span><b>SCORE 84/100</b></div>
                <h2>Gate 3 Streetlight Outage Cluster</h2>
                <div className="cp-gis-chips"><span>9 complaints</span><span>91% semantic similarity</span><span>&lt;150m proximity</span></div>
                <div className="cp-gis-detail-grid"><div><small>Average Age</small><b>6.2 days</b></div><div><small>Affected Footprint</small><b>0.8 km²</b></div><div><small>Root Asset Identified</small><code>Pole #GL-408 (Feeder Line B)</code></div></div>
                <button onClick={() => notify("Opening clustered incident thread")}>View Clustered Incident Thread <Icon>arrow_forward</Icon></button>
              </div>
            </div>

            {inspectorOpen && <div className="cp-gis-inspector"><div className="cp-gis-card">
              <div className="cp-gis-inspector-head"><div><div className="cp-gis-ticket"><code>CP-2026-004821</code><span>IN PROGRESS</span></div><h3>Streetlight near Gate 3 non-functional</h3></div><button onClick={() => setInspectorOpen(false)}><Icon>close</Icon></button></div>
              <div className="cp-gis-sla"><div><span><Icon>warning</Icon>Approaching SLA Breach</span><b>08h 42m remaining</b></div><div><i /></div></div>
              <div className="cp-gis-meta"><div><small>Priority Level</small><b className="error-dot">● High Priority</b></div><div><small>Reported Timestamp</small><b>7 days ago (Oct 18)</b></div><div><small>Assigned Bureau</small><b>Electrical Maintenance Div 4 (Core)</b></div><div><small>Deduplicated Inquiries</small><b className="linkish"><Icon>stacked_line_chart</Icon>9 related citizen inquiries bundled</b></div></div>
              <div className="cp-gis-crew"><div><span><Icon>minor_crash</Icon></span><div><b>Team 04 (Boom Truck #B-14)</b><small>En route · 1.2km away (~4 min)</small></div></div><i /></div>
              <div className="cp-gis-photo"><label>Geotagged Photo Verification</label><div><img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDD-CQL741QWzsVaCPpcOasMaS5lARYB5_HVnFtoHIGG217Hm-Dcu0tDSqJrHDefR2SXuurhJ7fp-8HkanpgKWusPISNUgA-yRuhLjoERMJustJWwkANQfCS8iXAZfKDFk84S3I7n_MpjtRYbzEWOz4LY1zrn7urhDW0xX7BMjlBH2Lfbr5EjaU8dfYqF-0NuAIauacwdC83klknCjPx1bTHI0S15dXBNXau189t8PLq5wLsy6TUynLmA" alt="Geotagged municipal streetlight inspection" /><span>LAT 42.3601° N, LON 71.0589° W</span></div></div>
              <div className="cp-gis-inspector-actions"><button onClick={() => notify("Opening operational command")}><Icon>terminal</Icon>View Operational Command</button><button onClick={() => notify("Nearest crew re-route requested")}><Icon>alt_route</Icon>Re-route Nearest Crew</button></div>
            </div></div>}

            <div className="cp-gis-legend"><span><i className="error"/>Critical Breach</span><span><i className="high"/>High Priority</span><span><i className="primary"/>Med / Low</span><span><i className="ring"/>Cluster Ring</span><span><small>Density:</small><b/></span></div>
            <div className="cp-gis-map-controls"><div><small>500 m / 0.5 mi</small><i /></div><section><button onClick={() => setZoom(z => Math.min(125, z + 10))}><Icon>add</Icon></button><button onClick={() => setZoom(z => Math.max(85, z - 10))}><Icon>remove</Icon></button><button onClick={() => setZoom(100)}><Icon>my_location</Icon></button><button onClick={() => notify("North orientation restored")}><Icon>explore</Icon></button></section></div>
          </section>
        </main>
      </div>
      {toast && <div className="cp-gis-toast">{toast}</div>}
    </div>
  );
}
