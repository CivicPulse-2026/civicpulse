import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { analyticsService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./Analytics.css";

const DOMAIN_META = {
  "Street Light": ["lightbulb", "primary"],
  "Water / Drainage": ["water_drop", "secondary"],
  "Pothole": ["add_road", "tint"],
  "Garbage / Sanitation": ["delete", "dim"],
  "Noise": ["graphic_eq", "outline"],
  "Graffiti": ["format_paint", "outline"],
  "Traffic Signal": ["traffic", "primary-container"],
  "Parks / Trees": ["park", "secondary"],
  "Other": ["more_horiz", "outline"],
};

const AGING_META = [
  ["0-1d", "secondary", "< 24 Hours (Fresh Intake)", "Normal dispatch processing envelope"],
  ["1-3d", "primary", "1 – 3 Days (In Progress)", "Active field assessment or parts procurement"],
  ["3-7d", "amber", "3 – 7 Days (Approaching Limit)", "Escalation warnings flagged to supervisors"],
  ["7d+", "error", "7+ Days (Critical Stagnation)", "Immediate intervention mandated"],
];

const INSIGHT_ICONS = ["bolt", "schedule", "notification_important", "share_location"];
const INSIGHT_TONES = ["amber", "error", "amber", "primary"];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function Sparkline({ path, tone = "secondary" }) {
  return (
    <svg className={`cp-analytics-spark cp-tone-${tone}`} viewBox="0 0 60 16" fill="none">
      <path d={path} stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function MetricCard({ label, icon, value, suffix, change, changeIcon, note, children, tone = "primary" }) {
  return (
    <div className="cp-analytics-kpi">
      <div className="cp-analytics-kpi-head">
        <span>{label}</span><Icon className={`cp-tone-${tone}`}>{icon}</Icon>
      </div>
      <div className="cp-analytics-kpi-value">
        {value}{suffix && <span>{suffix}</span>}
      </div>
      <div className="cp-analytics-kpi-meta">
        <span className={change?.startsWith("-") ? "cp-negative" : "cp-positive"}>
          {changeIcon && <Icon>{changeIcon}</Icon>}{change}
        </span>
        <span>{note}</span>
      </div>
      {children}
    </div>
  );
}

// Build an SVG polyline path (viewBox 0..width x 0..height) from a numeric series.
function seriesPath(values, width, height, pad = 2) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - pad - (v / max) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function Analytics() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState("30D");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [toast, setToast] = useState("");

  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [aging, setAging] = useState(null);
  const [trajectory, setTrajectory] = useState([]);
  const [sla, setSla] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [insights, setInsights] = useState([]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicPulseAnalyticsToast);
    window.__civicPulseAnalyticsToast = window.setTimeout(() => setToast(""), 2200);
  };

  // Static datasets (don't depend on period).
  useEffect(() => {
    analyticsService.distribution().then(setDistribution).catch(() => {});
    analyticsService.aging().then((a) => setAging(a.buckets)).catch(() => {});
    analyticsService.sla().then(setSla).catch(() => {});
    analyticsService.departments().then((d) => setDepartments(d.departments || [])).catch(() => {});
    analyticsService.insights().then((i) => setInsights(i.insights || [])).catch(() => {});
  }, []);

  // Period-dependent datasets.
  useEffect(() => {
    analyticsService.summary(period).then(setSummary).catch(() => {});
    analyticsService.trajectory(period).then((t) => setTrajectory(t.series || [])).catch(() => {});
  }, [period]);

  const domainRows = useMemo(() => {
    const byCat = distribution?.by_category || {};
    const total = Object.values(byCat).reduce((s, n) => s + n, 0) || 1;
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const [icon, tone] = DOMAIN_META[name] || ["more_horiz", "outline"];
        return { name, icon, tone, count, pct: ((count / total) * 100).toFixed(1) };
      });
  }, [distribution]);

  const priorityBreakdown = useMemo(() => {
    const byP = distribution?.by_priority || {};
    const total = Object.values(byP).reduce((s, n) => s + n, 0) || 1;
    const pct = (n) => ((n / total) * 100).toFixed(1);
    return {
      total,
      critical: byP.CRITICAL || 0,
      high: byP.HIGH || 0,
      medium: byP.MEDIUM || 0,
      low: byP.LOW || 0,
      pct,
    };
  }, [distribution]);

  const agingRows = useMemo(() => {
    if (!aging) return [];
    const total = Object.values(aging).reduce((s, n) => s + n, 0) || 1;
    return AGING_META.map(([key, tone, title, desc]) => ({
      key, tone, title, desc,
      count: aging[key] || 0,
      pct: `${(((aging[key] || 0) / total) * 100).toFixed(1)}%`,
    }));
  }, [aging]);

  const agingWidths = useMemo(() => {
    if (!aging) return ["25%", "25%", "25%", "25%"];
    const total = Object.values(aging).reduce((s, n) => s + n, 0) || 1;
    return AGING_META.map(([key]) => `${((aging[key] || 0) / total) * 100}%`);
  }, [aging]);

  const totalDist = useMemo(
    () => Object.values(distribution?.by_category || {}).reduce((s, n) => s + n, 0),
    [distribution]
  );

  const intakePath = useMemo(
    () => seriesPath(trajectory.map((d) => d.received), 800, 240, 20),
    [trajectory]
  );
  const clearancePath = useMemo(
    () => seriesPath(trajectory.map((d) => d.resolved), 800, 240, 20),
    [trajectory]
  );

  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(departmentFilter.toLowerCase())),
    [departments, departmentFilter]
  );

  const downloadCSV = () => {
    const header = ["Department", "Open", "Resolved", "Total", "SLA %"];
    const rows = filteredDepartments.map((d) => {
      const conf = d.total ? ((d.resolved / d.total) * 100).toFixed(1) : "0";
      return [d.name, d.open, d.resolved, d.total, `${conf}%`];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "civicpulse-department-performance.csv"; a.click();
    URL.revokeObjectURL(url);
    notify("Department CSV exported.");
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  return (
    <div className="cp-analytics-app">
      <AdminSidebar activeKey="analytics" user={user} onLogout={handleLogout} />

      <div className="cp-analytics-shell">
        <header className="cp-analytics-header">
          <div className="cp-analytics-console">
            <Icon className="cp-tone-primary">tune</Icon>
            <span>Municipal Console</span><b>/</b><strong>Central Operations</strong>
          </div>

          <div className="cp-analytics-search">
            <Icon>search</Icon>
            <input placeholder="Search tickets, assets, locations (Press ⌘K)..." aria-label="Search" />
            <kbd>⌘K</kbd>
          </div>

          <div className="cp-analytics-header-right">
            <div className="cp-analytics-online"><i />Dispatch Pipes Online</div>
            <div className="cp-analytics-divider" />
            <button className="cp-icon-button" onClick={() => notify("3 notifications awaiting review.")}>
              <Icon>notifications</Icon><em>3</em>
            </button>
            <div className="cp-header-user">
              <div className="cp-header-avatar"><Icon>person</Icon></div>
              <div>
                <span>{user?.name || "Municipal User"}</span>
                <small>{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Staff"}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="cp-analytics-main">
          <div className="cp-analytics-content">
            <section className="cp-analytics-control">
              <div>
                <div className="cp-analytics-title-row">
                  <h1>Civic Intelligence</h1>
                  <span className="cp-live-pill"><i />Real-time Telemetry</span>
                </div>
                <p>Understand what is happening across the city infrastructure and dispatch grid.</p>
              </div>
              <div className="cp-control-actions">
                <div className="cp-segment">
                  {["7D", "30D", "90D", "1Y"].map((p) => (
                    <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
                      {p}
                    </button>
                  ))}
                </div>
                <button className="cp-primary-button" onClick={() => notify("Intelligence briefing export started.")}>
                  <Icon>download</Icon>Export Intelligence Briefing
                </button>
              </div>
            </section>

            <section className="cp-analytics-kpi-grid">
              <MetricCard label={`Received (${period})`} icon="inbox" value={summary?.received ?? "—"} change="" note="new complaints">
              </MetricCard>
              <MetricCard label={`Resolved (${period})`} icon="check_circle" tone="secondary" value={summary?.resolved ?? "—"} change="" note="cleared">
              </MetricCard>
              <MetricCard label="Resolution Rate" icon="percent" value={summary ? `${summary.resolution_rate}` : "—"} suffix="%" change="" note={`${period} window`} tone="primary">
                <div className="cp-progress"><span style={{ width: `${summary?.resolution_rate ?? 0}%` }} /></div>
              </MetricCard>
              <MetricCard label="Avg Resolution" icon="timelapse" value={summary?.avg_resolution_hours ?? "—"} suffix="hrs" change="" note="MTTR">
              </MetricCard>
              <MetricCard label="SLA Compliance" icon="verified_user" value={sla ? `${sla.compliance}` : "—"} suffix="%" change="" note="Target: 90%" tone="primary">
                <div className="cp-progress"><span className="cp-progress-secondary" style={{ width: `${sla?.compliance ?? 0}%` }} /></div>
              </MetricCard>
              <MetricCard label="SLA Breached" icon="warning" value={sla?.breached ?? "—"} change="" note={`${sla?.on_time ?? 0} on time`} tone="secondary">
              </MetricCard>
            </section>

            <section className="cp-chart-grid">
              <div className="cp-panel cp-trajectory">
                <div className="cp-panel-head">
                  <div>
                    <div className="cp-heading-inline"><h2>Complaint & Resolution Trajectory</h2><span><i />Live</span></div>
                    <p>Dual-metric telemetry showing intake velocity vs crew clearance rate</p>
                  </div>
                  <div className="cp-chart-tools">
                    <div className="cp-chart-legend"><span><i className="blue" />Intake</span><span><i className="teal" />Clearance</span></div>
                    <div className="cp-mini-segment">
                      {["7D", "30D", "90D"].map((p) => <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p}</button>)}
                    </div>
                  </div>
                </div>

                <div className="cp-trajectory-chart">
                  <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                    {[40, 90, 140, 190].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} />)}
                    {intakePath && <path className="intake" d={intakePath} />}
                    {clearancePath && <path className="clearance" d={clearancePath} />}
                  </svg>
                  {trajectory.length === 0 && <p className="cp-chart-empty">No trajectory data for this period.</p>}
                </div>
                <div className="cp-trajectory-footer">
                  <span><Icon>verified</Icon>Showing {trajectory.length} days of intake vs clearance.</span>
                  <button onClick={() => navigate("/admin/complaints")}>Open Complaint Queue <Icon>arrow_forward</Icon></button>
                </div>
              </div>

              <div className="cp-panel cp-sla">
                <div className="cp-panel-head">
                  <div><h2>SLA Conformance</h2><p>Statutory response metrics</p></div>
                  <span className="cp-mom">{sla ? `${sla.compliance}%` : "—"}</span>
                </div>
                <div className="cp-ring-wrap">
                  <div className="cp-ring">
                    <svg viewBox="0 0 120 120"><circle className="track" cx="60" cy="60" r="50" /><circle className="value" cx="60" cy="60" r="50" /></svg>
                    <div><strong>{sla ? `${sla.compliance}%` : "—"}</strong><span>Within SLA Target</span><b>Threshold: 90%</b></div>
                  </div>
                </div>
                <div className="cp-mttr"> <span><Icon>timer</Icon>Mean Time to Resolve (MTTR)</span><strong>{summary?.avg_resolution_hours ?? "—"} hrs</strong></div>
                <div className="cp-division-grid">
                  <div><small>On Time</small><strong>{sla?.on_time ?? "—"}</strong><b>within target</b></div>
                  <div><small>Breached</small><strong>{sla?.breached ?? "—"}</strong><b>past due</b></div>
                </div>
                <button className="cp-secondary-button" onClick={() => navigate("/admin/complaints")}><Icon>tune</Icon>Review Open Tickets</button>
              </div>
            </section>

            <section className="cp-secondary-grid">
              <div className="cp-panel cp-domain-panel">
                <div className="cp-panel-head"><div><h2>Distribution by Domain & Infrastructure</h2><p>Complaint volume categorized across municipal core assets</p></div><code>TOTAL: {totalDist}</code></div>
                <div className="cp-domain-list">
                  {domainRows.map(({ icon, tone, name, count, pct }) => (
                    <div className="cp-domain-row" key={name}>
                      <div className="cp-domain-label"><span><Icon className={`cp-tone-${tone}`}>{icon}</Icon>{name}</span><b>{count}<em>{pct}%</em></b></div>
                      <div className="cp-bar"><span className={`cp-bar-${tone}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  ))}
                  {domainRows.length === 0 && <p className="cp-chart-empty">No distribution data.</p>}
                </div>
                <div className="cp-priority-title">Active Priority Breakdown (Total: {priorityBreakdown.total})</div>
                <div className="cp-priority-grid">
                  <div className="critical"><span>Critical <i /></span><strong>{priorityBreakdown.critical}</strong><small>{priorityBreakdown.pct(priorityBreakdown.critical)}%</small></div>
                  <div className="high"><span>High <i /></span><strong>{priorityBreakdown.high}</strong><small>{priorityBreakdown.pct(priorityBreakdown.high)}%</small></div>
                  <div className="medium"><span>Medium <i /></span><strong>{priorityBreakdown.medium}</strong><small>{priorityBreakdown.pct(priorityBreakdown.medium)}%</small></div>
                  <div className="low"><span>Low <i /></span><strong>{priorityBreakdown.low}</strong><small>{priorityBreakdown.pct(priorityBreakdown.low)}%</small></div>
                </div>
              </div>

              <div className="cp-panel cp-aging">
                <div className="cp-panel-head"><div><h2>Queue Aging Dynamics</h2><p>Duration tickets remain unresolved</p></div><span className="cp-open-badge">{agingRows.reduce((s, r) => s + r.count, 0)} Open</span></div>
                <div className="cp-aging-stack">{agingWidths.map((w, i) => <span key={i} style={{ width: w }} />)}</div>
                <div className="cp-aging-axis"><span>0h</span><span>24h</span><span>72h</span><span>7 Days+</span></div>
                <div className="cp-aging-list">
                  {agingRows.map(({ key, tone, title, desc, count, pct }) => (
                    <div className={`cp-aging-row ${tone}`} key={key}>
                      <div className="cp-aging-info"><i /><div><strong>{title}{tone === "error" && <b>Backlog Risk</b>}</strong><small>{desc}</small></div></div>
                      <div><strong>{count}</strong><small>{pct}</small></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="cp-panel cp-insights">
              <div className="cp-insights-head">
                <div className="cp-insights-title"><div><Icon>psychology</Icon></div><div><h2>Civic Intelligence Signals <span>Auto-Triage v4.2</span></h2><p>Algorithmic pattern recognition and preventive field guidance</p></div></div>
                <span className="cp-patterns"><i />{insights.length} signal(s) identified</span>
              </div>
              <div className="cp-insight-grid">
                {insights.map((text, i) => (
                  <article className="cp-insight-card" key={i}>
                    <div>
                      <div className={`cp-insight-tag ${INSIGHT_TONES[i % INSIGHT_TONES.length]}`}><Icon>{INSIGHT_ICONS[i % INSIGHT_ICONS.length]}</Icon>Signal</div><code>P-{i + 1}</code>
                      <h3>{text}</h3>
                    </div>
                  </article>
                ))}
                {insights.length === 0 && <p className="cp-chart-empty">No signals yet.</p>}
              </div>
            </section>

            <section className="cp-panel cp-departments">
              <div className="cp-department-head">
                <div><h2>Department Performance & Field Velocity</h2><p>Clearance metrics and SLA compliance across municipal divisions</p></div>
                <div><div className="cp-filter"><Icon>filter_list</Icon><input value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="Filter departments..." /></div><button className="cp-csv-button" onClick={downloadCSV}><Icon>file_download</Icon>CSV</button></div>
              </div>
              <div className="cp-table-wrap">
                <table>
                  <thead><tr><th>Department & Division</th><th>Open</th><th>Resolved</th><th>Total</th><th>Clearance</th><th>Status</th><th>Trend</th></tr></thead>
                  <tbody>
                    {filteredDepartments.map((d) => {
                      const conf = d.total ? (d.resolved / d.total) * 100 : 0;
                      const status = conf >= 90 ? "On Track" : conf >= 75 ? "Warning: below target" : "Critical";
                      return (
                        <tr key={d.name}>
                          <td><div className="cp-dept-name"><span className="cp-dept-icon cp-tone-primary"><Icon>corporate_fare</Icon></span><div><strong>{d.name}</strong><small>{d.total} total complaints</small></div></div></td>
                          <td>{d.open}</td><td>{d.resolved}</td><td>{d.total}</td>
                          <td><div className="cp-sla-cell"><b className={conf < 90 ? "cp-error-text" : ""}>{conf.toFixed(1)}%</b><span><i style={{ width: `${conf}%` }} /></span></div></td>
                          <td><span className={`cp-status ${status.includes("Warning") ? "warning" : status.includes("Critical") ? "warning" : ""}`}><i />{status}</span></td>
                          <td><Sparkline path="M0 8 L15 6 L30 9 L45 5 L60 3" tone={conf < 90 ? "error" : "secondary"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredDepartments.length === 0 && <p className="cp-chart-empty">No departments match.</p>}
              </div>
              <div className="cp-table-footer"><span>Displaying {filteredDepartments.length} of {departments.length} active municipal field divisions</span></div>
            </section>
          </div>
        </main>
      </div>

      {toast && <div className="cp-analytics-toast"><Icon>check_circle</Icon>{toast}</div>}
    </div>
  );
}
