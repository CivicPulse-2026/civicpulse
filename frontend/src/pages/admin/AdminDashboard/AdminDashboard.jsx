import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { analyticsService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./AdminDashboard.css";

const DISTRIBUTION_TONES = ["primary", "water", "secondary", "green", "amber", "outline"];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function KpiCard({ label, icon, value, change, footer, footerRight, tone = "primary", critical = false }) {
  return (
    <div className={`cp-kpi-card ${critical ? "critical" : ""}`}>
      <div className="cp-kpi-top">
        <span className={`cp-kpi-label ${critical ? "error-text" : ""}`}>{label}</span>
        <span className={`cp-kpi-icon ${tone}`}>
          <Icon>{icon}</Icon>
        </span>
      </div>
      <div className="cp-kpi-value-row">
        <span className={`cp-kpi-value ${critical ? "error-text" : ""}`}>{value}</span>
        <span className={`cp-kpi-change ${critical ? "negative" : ""}`}>{change}</span>
      </div>
      <div className="cp-kpi-footer">
        <span>{footer}</span>
        {footerRight ? <span className={critical ? "error-text" : ""}>{footerRight}</span> : null}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [toast, setToast] = useState("");
  const [mapMode, setMapMode] = useState("All");
  const [stats, setStats] = useState(null);
  const [attention, setAttention] = useState([]);
  const [distribution, setDistribution] = useState([]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicPulseToast);
    window.__civicPulseToast = window.setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    let active = true;

    analyticsService.dashboardStats().then((s) => active && setStats(s)).catch(() => {});
    analyticsService.attention().then((a) => active && setAttention(a.items || [])).catch(() => {});
    analyticsService
      .distribution()
      .then((d) => {
        if (!active) return;
        const byCategory = d.by_category || {};
        const total = Object.values(byCategory).reduce((sum, n) => sum + n, 0) || 1;
        const rows = Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value], i) => ({
            name,
            value,
            pct: `${((value / total) * 100).toFixed(1)}%`,
            tone: DISTRIBUTION_TONES[i % DISTRIBUTION_TONES.length],
          }));
        setDistribution(rows);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const fmtNum = (n) => (n == null ? "—" : n.toLocaleString());

  return (
    <div className="cp-admin-dashboard">
      <AdminSidebar activeKey="dashboard" user={user} onLogout={handleLogout} />

      <div className="cp-admin-shell">
        <header className="cp-admin-topbar">
          <div className="cp-admin-breadcrumb">
            <Icon className="primary-text">tune</Icon>
            <span>Municipal Console</span>
            <span className="slash">/</span>
            <strong>Ward 4 Central Operations</strong>
          </div>

          <div className="cp-admin-search">
            <Icon>search</Icon>
            <input
              placeholder="Search tickets, assets, locations (Press ⌘K)..."
              onKeyDown={(e) => {
                if (e.key === "Enter") notify(`Searching for "${e.currentTarget.value}"`);
              }}
            />
            <kbd>⌘K</kbd>
          </div>

          <div className="cp-admin-top-actions">
            <div className="cp-dispatch-online">
              <span className="pulse-dot"><span /></span>
              <span>Dispatch Pipes Online</span>
            </div>
            <div className="top-divider" />
            <button className="icon-button notification-button" onClick={() => notify("3 notifications")}>
              <Icon>notifications</Icon>
              <span className="notification-count">3</span>
            </button>
            <div className="cp-top-user">
              <div className="cp-top-avatar"><Icon>person</Icon></div>
              <div>
                <span>{user?.name || "Municipal User"}</span>
                <small>{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Staff"}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="cp-admin-main">
          <div className="cp-admin-content">
            <section className="cp-context-header">
              <div>
                <div className="cp-context-title">
                  <h1>City Operations</h1>
                  <span>Ward 4 Central</span>
                </div>
                <p>Real-time overview of civic issues across the city.</p>
              </div>

              <div className="cp-action-cluster">
                <div className="telemetry-pill">
                  <span className="telemetry-dot"><span /></span>
                  <span>Live Telemetry • Synced 3s ago</span>
                </div>
                <button className="date-pill" onClick={() => notify("Date selector opened")}>
                  <Icon>calendar_today</Icon>
                  <strong>Today, Oct 21</strong>
                  <Icon>expand_more</Icon>
                </button>
                <button className="export-button" onClick={() => notify("Briefing export requested")}>
                  <Icon>download</Icon>
                  <span>Export Briefing</span>
                </button>
              </div>
            </section>

            <section className="cp-kpi-grid">
              <KpiCard label="Total Complaints" icon="stacked_line_chart" value={fmtNum(stats?.total)} change="" footer="All time" tone="primary" />
              <KpiCard label="Open Issues" icon="pending_actions" value={fmtNum(stats ? stats.total - stats.resolved : null)} change="" footer="Active workload" footerRight={`${stats?.in_progress ?? 0} in progress`} tone="primary-container" />
              <KpiCard label="Resolved" icon="task_alt" value={fmtNum(stats?.resolved)} change="" footer="Resolution pace" footerRight={`${stats?.resolution_rate ?? 0}% rate`} tone="secondary" />
              <KpiCard label="Overdue (SLA)" icon="verified" value={fmtNum(stats?.overdue)} change="" footer="Past SLA due" footerRight={stats && stats.overdue === 0 ? "On target" : "Action needed"} tone="primary" />
              <KpiCard label="Critical Issues" icon="priority_high" value={fmtNum(stats?.critical)} change="" footer="Immediate dispatch" footerRight="Action needed" tone="error" critical />
            </section>

            <section className="cp-spatial-grid">
              <div className="cp-map-card">
                <div className="cp-panel-toolbar">
                  <div className="cp-map-heading">
                    <div className="cp-heading-title">
                      <Icon className="primary-text">layers</Icon>
                      <h2>City Issue Map</h2>
                    </div>
                    <span className="toolbar-divider" />
                    <button className="district-select" onClick={() => notify("District selector opened")}>
                      <span>District:</span>
                      <strong>Metro North & Central</strong>
                      <Icon>expand_more</Icon>
                    </button>
                  </div>

                  <div className="map-tabs">
                    {["All", "Critical Only", "Clusters", "Service Fleet"].map((mode) => (
                      <button
                        key={mode}
                        className={mapMode === mode ? "active" : ""}
                        onClick={() => setMapMode(mode)}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cp-map-canvas">
                  <div className="map-grid" />

                  <svg className="map-svg" viewBox="0 0 900 460" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="arteryGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity=".6" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity=".3" />
                      </linearGradient>
                      <radialGradient id="heatWard12">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity=".35" />
                        <stop offset="60%" stopColor="#ef4444" stopOpacity=".12" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="heatCentral">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity=".3" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity=".08" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <circle cx="306" cy="193" r="90" fill="url(#heatWard12)" />
                    <circle cx="612" cy="267" r="100" fill="url(#heatCentral)" />

                    <path d="M40 60L220 40L310 130L190 210Z" fill="#1e293b" fillOpacity=".3" stroke="#334155" strokeDasharray="3,3" />
                    <path d="M220 40L460 30L520 180L310 130Z" fill="#1e293b" fillOpacity=".15" stroke="#334155" strokeDasharray="3,3" />
                    <path d="M310 130L520 180L480 340L290 320L190 210Z" fill="#1e293b" fillOpacity=".25" stroke="#334155" strokeDasharray="3,3" />
                    <path d="M480 340L740 320L710 440L320 450Z" fill="#1e293b" fillOpacity=".2" stroke="#334155" strokeDasharray="3,3" />
                    <path d="M520 180L760 140L820 290L480 340Z" fill="#1e293b" fillOpacity=".3" stroke="#334155" strokeDasharray="3,3" />

                    <path d="M0 180Q240 160 420 220T800 210" fill="none" stroke="url(#arteryGlow)" strokeWidth="2.5" />
                    <path d="M380 0Q420 190 440 320T560 460" fill="none" opacity=".8" stroke="url(#arteryGlow)" strokeWidth="2" />
                    <path d="M120 380L320 310L640 360L780 420" fill="none" opacity=".6" stroke="#475569" strokeDasharray="4,4" strokeWidth="1.5" />

                    <text fill="#94a3b8" fontFamily="Geist" fontSize="11" fontWeight="600" letterSpacing="1" x="110" y="110">WARD 08</text>
                    <text fill="#94a3b8" fontFamily="Geist" fontSize="11" fontWeight="600" letterSpacing="1" x="350" y="80">WARD 04</text>
                    <text fill="#f87171" fontFamily="Geist" fontSize="11" fontWeight="700" letterSpacing="1" x="240" y="270">WARD 12 (ALERT)</text>
                    <text fill="#fbbf24" fontFamily="Geist" fontSize="11" fontWeight="600" letterSpacing="1" x="580" y="240">CENTRAL MARKET</text>
                    <text fill="#94a3b8" fontFamily="Geist" fontSize="11" fontWeight="600" letterSpacing="1" x="640" y="380">SECTOR 9 HARBOR</text>
                  </svg>

                  <button className="map-marker critical-marker" onClick={() => notify("CP-8921 • Ward 12 Water Supply Main")}>
                    <span className="marker-ping" />
                    <span className="marker-core"><Icon>water_drop</Icon></span>
                    <span className="map-tooltip">
                      <strong>CRITICAL INCIDENT</strong>
                      <em>#CP-8921</em>
                      <b>Ward 12 Water Supply Main</b>
                      <small>18 complaints • Pressure drop + pipe burst</small>
                    </span>
                  </button>

                  <button className="map-marker light-marker" onClick={() => notify("Gate 3 Streetlight Hub")}>
                    <span className="marker-ping" />
                    <span className="marker-core"><Icon>lightbulb</Icon></span>
                    <span className="map-tooltip">
                      <strong>HIGH PRIORITY</strong>
                      <b>Gate 3 Streetlight Hub</b>
                      <small>9 complaints • 6d active</small>
                    </span>
                  </button>

                  <button className="cluster-badge water-cluster" onClick={() => notify("Water outage cluster: 18 complaints")}>
                    <Icon>hub</Icon><span>+18 Water Outages</span>
                  </button>

                  <button className="cluster-badge light-cluster" onClick={() => notify("Streetlight cluster: 9 complaints")}>
                    <Icon>crisis_alert</Icon><span>+9 Streetlights</span>
                  </button>

                  <button className="road-marker" onClick={() => notify("Central Market Road Damage")}>
                    <Icon>construction</Icon>
                  </button>

                  <span className="secondary-node node-one" />
                  <span className="secondary-node node-two" />
                  <span className="secondary-node node-three" />
                  <span className="secondary-node node-four" />

                  <div className="crew-label"><span /> CREW-04 (WATER)</div>

                  <div className="map-controls">
                    <button onClick={() => notify("Zoom in")}><Icon>add</Icon></button>
                    <button onClick={() => notify("Zoom out")}><Icon>remove</Icon></button>
                    <button onClick={() => notify("Centered on Ward 4")}><Icon>my_location</Icon></button>
                  </div>

                  <div className="map-legend">
                    <span><i className="legend-critical" />Critical Breach</span>
                    <span><i className="legend-high" />High Priority</span>
                    <span><i className="legend-cluster" />Cluster Group</span>
                    <span><i className="legend-crew" />Active Crew</span>
                  </div>
                </div>

                <div className="cp-map-summary">
                  <div>
                    <span>Coverage Grid: <strong>98.2% Active</strong></span>
                    <span>Response Units Deployed: <strong>14/18 Crews</strong></span>
                    <span>Est. Clear Window: <strong>4.2 hrs avg</strong></span>
                  </div>
                  <button onClick={() => notify("Geospatial inspector opened")}>
                    Expand Geospatial Inspector <Icon>arrow_forward</Icon>
                  </button>
                </div>
              </div>

              <div className="cp-attention-card">
                <div>
                  <div className="attention-header">
                    <div>
                      <h2>Needs Attention <span>{attention.length} items</span></h2>
                    </div>
                    <button onClick={() => navigate("/admin/complaints")}><Icon>tune</Icon></button>
                  </div>

                  <div className="attention-stack">
                    {attention.length === 0 && (
                      <p style={{ color: "var(--on-surface-variant)", fontSize: 14, padding: "12px 0" }}>
                        No items need attention right now.
                      </p>
                    )}
                    {attention.map((item) => {
                      const critical = item.priority === "CRITICAL";
                      const high = item.priority === "HIGH";
                      return (
                        <AttentionItem
                          key={item.id}
                          status={item.priority}
                          id={`#${item.ticket_id}`}
                          timer={item.sla_due_at ? new Date(item.sla_due_at).toLocaleDateString() : "No SLA"}
                          timerIcon={critical ? "alarm" : "timer"}
                          title={item.category}
                          description={item.description}
                          team={item.department || "Unassigned"}
                          teamIcon="engineering"
                          action="Details"
                          critical={critical}
                          high={high}
                          onAction={() => navigate(`/admin/complaints/${item.id}`)}
                        />
                      );
                    })}
                  </div>
                </div>

                <button className="attention-footer" onClick={() => navigate("/admin/complaints")}>
                  <span>View all complaints</span>
                  <Icon>arrow_forward</Icon>
                </button>
              </div>
            </section>

            <section className="cp-analytics-grid">
              <IssueDistribution issues={distribution} total={stats?.total} />
              <AgingComplaints />
              <SlaPerformance />
            </section>
          </div>
        </main>
      </div>

      {toast && <div className="cp-dashboard-toast">{toast}</div>}
    </div>
  );
}

function AttentionItem({ status, id, timer, timerIcon, title, description, team, teamIcon, action, critical, breached, high, onAction }) {
  return (
    <div className={`attention-item ${critical ? "critical" : ""} ${breached ? "breached" : ""}`}>
      <div className="attention-item-top">
        <div>
          <span className={`status-tag ${critical ? "critical" : breached ? "breached" : "high"}`}>{status}</span>
          <span className={`attention-id ${breached ? "error-text" : ""}`}>{id}</span>
        </div>
        <span className={`attention-timer ${critical || breached ? "error-text" : "amber-text"}`}>
          <Icon>{timerIcon}</Icon>{timer}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="attention-item-footer">
        <span><Icon>{teamIcon}</Icon>{team}</span>
        <button className={critical ? "dispatch" : ""} onClick={onAction}>{action}</button>
      </div>
    </div>
  );
}

function IssueDistribution({ issues, total }) {
  const leading = issues[0]?.name || "—";
  return (
    <div className="analytics-card">
      <div className="analytics-card-heading">
        <div><h3>Issue Distribution</h3><p>Active volume by civic sector</p></div>
        <strong>{total != null ? `${total.toLocaleString()} Total` : "—"}</strong>
      </div>
      <div className="distribution-list">
        {issues.length === 0 && (
          <p style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>No data yet.</p>
        )}
        {issues.map((issue) => (
          <div key={issue.name} className="distribution-row">
            <div><span>{issue.name}</span><strong>{issue.value} ({issue.pct})</strong></div>
            <div className="bar-track"><div className={`bar-fill ${issue.tone}`} style={{ width: issue.pct }} /></div>
          </div>
        ))}
      </div>
      <div className="analytics-footer"><span>Leading category: <strong>{leading}</strong></span></div>
    </div>
  );
}

function AgingComplaints() {
  return (
    <div className="analytics-card">
      <div className="analytics-card-heading">
        <div><h3>Aging Complaints</h3><p>Ticket duration before resolution</p></div>
        <strong>Avg: 38.6h</strong>
      </div>

      <div className="aging-strip">
        <div className="green" style={{ width: "45%" }} />
        <div className="sky" style={{ width: "31%" }} />
        <div className="amber" style={{ width: "17%" }} />
        <div className="red" style={{ width: "7%" }} />
      </div>

      <div className="aging-grid">
        <AgingBox color="green" label="< 24 hours" value="310" pct="45%" />
        <AgingBox color="sky" label="1 – 3 days" value="215" pct="31%" />
        <AgingBox color="amber" label="3 – 7 days" value="118" pct="17%" />
        <AgingBox color="red" label="7+ days (Backlog)" value="41" pct="6%" error />
      </div>

      <div className="analytics-footer"><span>Target compliance threshold: <strong>72h max</strong></span><span className="secondary-text">94% within 7d</span></div>
    </div>
  );
}

function AgingBox({ color, label, value, pct, error }) {
  return (
    <div className={`aging-box ${error ? "error-box" : ""}`}>
      <div><i className={`aging-dot ${color}`} /><span>{label}</span></div>
      <div><strong>{value}</strong><em className={error ? "error-text" : ""}>{pct}</em></div>
    </div>
  );
}

function SlaPerformance() {
  return (
    <div className="analytics-card">
      <div className="analytics-card-heading">
        <div><h3>SLA Performance</h3><p>7-day benchmark conformance</p></div>
        <strong className="benchmark">Benchmark 90%</strong>
      </div>

      <div className="sla-value-row">
        <span>91.4%</span>
        <strong><Icon>arrow_upward</Icon>1.4% over benchmark</strong>
      </div>

      <div className="sla-chart">
        <svg viewBox="0 0 280 80" preserveAspectRatio="none">
          <line stroke="#cbd5e1" strokeDasharray="4,4" strokeWidth="1.5" x1="0" x2="280" y1="42" y2="42" />
          <text fill="#94a3b8" fontFamily="JetBrains Mono" fontSize="9" x="240" y="38">90% Target</text>
          <defs>
            <linearGradient id="slaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1e40af" stopOpacity=".25" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 48L46 38L92 40L138 32L184 30L230 24L280 20L280 80L0 80Z" fill="url(#slaGradient)" />
          <path d="M0 48L46 38L92 40L138 32L184 30L230 24L280 20" fill="none" stroke="#1e40af" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          {[["0","48"],["46","38"],["92","40"],["138","32"],["184","30"],["230","24"]].map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} fill="#1e40af" r="3" />
          ))}
          <circle cx="280" cy="20" fill="#00288e" r="4" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>

      <div className="chart-labels"><span>Oct 15</span><span>Oct 17</span><span>Oct 19</span><span>Today (Oct 21)</span></div>
      <div className="analytics-footer"><span>MTTR: <strong className="mono">38.6 hrs</strong></span><span className="secondary-text">Fastest: Sanitation (14.2h)</span></div>
    </div>
  );
}
