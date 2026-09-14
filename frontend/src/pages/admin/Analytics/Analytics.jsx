import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import "./Analytics.css";

const domains = [
  ["lightbulb", "primary", "Streetlight & Public Luminaires", 628, 25.3],
  ["water_drop", "secondary", "Water Resources & Hydrants", 512, 20.6],
  ["add_road", "tint", "Road, Pavement & Sidewalk Potholes", 489, 19.7],
  ["delete", "dim", "Garbage, Refuse & Illegal Dumping", 342, 13.8],
  ["water_damage", "outline", "Sanitation, Stormwater & Drains", 294, 11.9],
  ["more_horiz", "outline", "Other Municipal Infrastructure", 216, 8.7],
];

const aging = [
  ["secondary", "< 24 Hours (Fresh Intake)", "Normal dispatch processing envelope", 310, "45.3%"],
  ["primary", "1 – 3 Days (In Progress)", "Active field assessment or parts procurement", 215, "31.4%"],
  ["amber", "3 – 7 Days (Approaching Limit)", "Escalation warnings flagged to crew supervisors", 118, "17.2%"],
  ["error", "7+ Days (Critical Stagnation)", "Immediate intervention mandated", 41, "6.0%"],
];

const insights = [
  {
    icon: "bolt", type: "Surging Volume", code: "P-91", tone: "amber",
    title: "Streetlight complaints increased 23% this week",
    body: "Sector 04 & North Corridor underground feeder degradation detected under rainy load.",
    action: "Batch dispatch cable diagnostic crew before nightfall to avert traffic hazard.",
  },
  {
    icon: "schedule", type: "MTTR Violation", code: "P-74", tone: "error",
    title: "Water issues have highest average resolution time",
    body: "Current MTTR is 42.0h versus the 36.0h statutory municipal threshold.",
    action: "Sub-contract valve replacement tasks in Ward 12 to resolve parts delivery bottleneck.",
  },
  {
    icon: "notification_important", type: "Breach Impending", code: "P-66", tone: "amber",
    title: "18% of unresolved complaints near SLA breach",
    body: "14 high-impact tickets have < 8h left on their resolution window.",
    action: "Auto-escalated to Senior Dispatch Desk Rahul Sharma for re-routing.",
  },
  {
    icon: "share_location", type: "Geographic Cluster", code: "P-42", tone: "primary",
    title: "Ward 12 density index reaches 3.8x baseline",
    body: "Extreme clustering around pipe pressure drop nodes in Old Town sector.",
    action: "Activate auxiliary mobile pump unit at Substation B to normalize hydrostatic line.",
  },
];

const departments = [
  ["bolt", "primary", "Electrical Maintenance Div 4", "Grid lighting, sensors & traffic signals", 82, 241, "31.0h", 94, "On Track", "M0 12 L15 14 L30 8 L45 9 L60 2"],
  ["water_drop", "secondary", "Water Resources Bureau", "Piping, hydrants & flow telemetry", 64, 198, "42.0h", 88, "Warning: -2% SLA", "M0 4 L15 6 L30 10 L45 8 L60 14"],
  ["recycling", "outline", "Sanitation & Waste Works", "Solid waste, collections & drains", 103, 317, "35.0h", 92, "On Track", "M0 10 L15 8 L30 11 L45 5 L60 3"],
  ["construction", "primary-container", "Public Works & Roads", "Asphalt resurfacing & footpaths", 145, 412, "39.0h", 91, "On Track", "M0 14 L15 10 L30 11 L45 8 L60 4"],
  ["park", "secondary", "Parks & Urban Forestry", "Pruning, median verges & landscaping", 38, 142, "28.0h", 96, "Exceeding Target", "M0 15 L15 11 L30 7 L45 5 L60 2"],
];

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

function MiniTrend({ tone = "primary", path }) {
  return (
    <svg className={`cp-analytics-mini-trend cp-tone-${tone}`} viewBox="0 0 100 24" fill="none" preserveAspectRatio="none">
      <path d={path} stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
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

export default function Analytics() {
  const [period, setPeriod] = useState("30D");
  const [topPeriod, setTopPeriod] = useState("Last 30 Days");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [toast, setToast] = useState("");

  const filteredDepartments = useMemo(
    () => departments.filter((d) => d[2].toLowerCase().includes(departmentFilter.toLowerCase())),
    [departmentFilter]
  );

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicPulseAnalyticsToast);
    window.__civicPulseAnalyticsToast = window.setTimeout(() => setToast(""), 2200);
  };

  const downloadCSV = () => {
    const header = ["Department","Open","Resolved","Avg MTTR","SLA Conformance"];
    const rows = filteredDepartments.map((d) => [d[2], d[4], d[5], d[6], `${d[7]}%`]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "civicpulse-department-performance.csv"; a.click();
    URL.revokeObjectURL(url);
    notify("Department CSV exported.");
  };

  return (
    <div className="cp-analytics-app">
      <AdminSidebar activeKey="analytics" onLogout={() => notify("Sign out action selected.")} />

      <div className="cp-analytics-shell">
        <header className="cp-analytics-header">
          <div className="cp-analytics-console">
            <Icon className="cp-tone-primary">tune</Icon>
            <span>Municipal Console</span><b>/</b><strong>Ward 4 Central Operations</strong>
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
              <div><span>Rahul Sharma</span><small>Senior Dispatcher</small></div>
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
                  {["7D", "Last 30 Days", "90D", "YTD"].map((p) => (
                    <button key={p} className={topPeriod === p ? "active" : ""} onClick={() => setTopPeriod(p)}>
                      {p}
                    </button>
                  ))}
                </div>
                <button className="cp-date-button" onClick={() => notify("Date range selector ready.")}>
                  <Icon>calendar_today</Icon>Oct 1 – Oct 31, 2024<Icon>expand_more</Icon>
                </button>
                <button className="cp-primary-button" onClick={() => notify("Intelligence briefing export started.")}>
                  <Icon>download</Icon>Export Intelligence Briefing
                </button>
              </div>
            </section>

            <section className="cp-analytics-kpi-grid">
              <MetricCard label="Total Complaints" icon="inbox" value="2,481" change="+12.4%" changeIcon="trending_up" note="vs prev period">
                <MiniTrend tone="primary" path="M0 20 Q 25 15, 50 18 T 100 4" />
              </MetricCard>
              <MetricCard label="Open Tickets" icon="pending_actions" value="684" change="27.5% ratio" note="42 high priority">
                <div className="cp-progress"><span style={{ width: "27.5%" }} /></div>
              </MetricCard>
              <MetricCard label="Resolved Cases" icon="check_circle" tone="secondary" value="1,797" change="72.5%" changeIcon="arrow_upward" note="Clearance rate">
                <MiniTrend tone="secondary" path="M0 22 Q 25 18, 50 11 T 100 2" />
              </MetricCard>
              <MetricCard label="Avg Resolution" icon="timelapse" value="38.6" suffix="hrs" change="-14.2h" changeIcon="trending_down" note="YoY velocity">
                <MiniTrend tone="primary" path="M0 4 Q 30 6, 60 14 T 100 21" />
              </MetricCard>
              <MetricCard label="SLA Compliance" icon="verified_user" value="91.4%" change="+3.1%" changeIcon="arrow_upward" note="Target: 90%" tone="primary">
                <div className="cp-progress"><span className="cp-progress-secondary" style={{ width: "91.4%" }} /></div>
              </MetricCard>
              <MetricCard label="Civic Health" icon="vital_signs" value="87" suffix="/ 100" change="Optimal Tier" note="Rank #2" tone="secondary">
                <div className="cp-health-bars"><i /><i /><i /><i /></div>
              </MetricCard>
            </section>

            <section className="cp-chart-grid">
              <div className="cp-panel cp-trajectory">
                <div className="cp-panel-head">
                  <div>
                    <div className="cp-heading-inline"><h2>Complaint & Resolution Trajectory</h2><span><i />Sync: 4m ago</span></div>
                    <p>Dual-metric telemetry showing intake velocity vs crew clearance rate</p>
                  </div>
                  <div className="cp-chart-tools">
                    <div className="cp-chart-legend"><span><i className="blue" />Intake</span><span><i className="teal" />Clearance</span></div>
                    <div className="cp-mini-segment">
                      {["7D","30D","90D"].map((p) => <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p}</button>)}
                    </div>
                  </div>
                </div>

                <div className="cp-trajectory-chart">
                  <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                    {[40,90,140,190].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} />)}
                    <g className="axis">
                      <text x="0" y="36">140</text><text x="0" y="86">105</text><text x="0" y="136">70</text><text x="0" y="186">35</text>
                    </g>
                    <path className="intake" d="M40 160 C100 145 140 170 200 130 C260 90 310 115 380 95 C450 75 520 85 590 62 C650 45 720 70 780 50" />
                    <path className="clearance" d="M40 175 C100 160 150 140 210 148 C270 156 320 120 390 110 C460 100 520 70 590 48 C660 30 710 40 780 32" />
                    <line className="hover-line" x1="590" x2="590" y1="20" y2="200" />
                    <circle className="point-blue" cx="590" cy="62" r="5" /><circle className="point-teal" cx="590" cy="48" r="5" />
                    <g transform="translate(525 6)">
                      <rect width="138" height="42" rx="4" />
                      <text className="callout-title" x="8" y="15">OCT 18 · WARD 4 PEAK</text>
                      <text className="callout-value" x="8" y="32">94 Intake · 112 Cleared</text>
                    </g>
                    <g className="x-axis">
                      <text x="40" y="218">Oct 01</text><text x="160" y="218">Oct 06</text><text x="280" y="218">Oct 11</text><text x="400" y="218">Oct 16</text><text x="520" y="218">Oct 21</text><text x="640" y="218">Oct 26</text><text x="760" y="218">Oct 31</text>
                    </g>
                  </svg>
                </div>
                <div className="cp-trajectory-footer">
                  <span><Icon>verified</Icon>Intake-to-Clearance velocity ratio is <strong>+1.19x</strong> (Net Negative Backlog accrual).</span>
                  <button onClick={() => notify("Dispatch cohort analysis opened.")}>Analyze Dispatch Cohorts <Icon>arrow_forward</Icon></button>
                </div>
              </div>

              <div className="cp-panel cp-sla">
                <div className="cp-panel-head">
                  <div><h2>SLA Conformance</h2><p>Statutory response metrics</p></div>
                  <span className="cp-mom">+3.1% MoM</span>
                </div>
                <div className="cp-ring-wrap">
                  <div className="cp-ring">
                    <svg viewBox="0 0 120 120"><circle className="track" cx="60" cy="60" r="50" /><circle className="value" cx="60" cy="60" r="50" /></svg>
                    <div><strong>91.4%</strong><span>Within SLA Target</span><b>Threshold: 90%</b></div>
                  </div>
                </div>
                <div className="cp-mttr"> <span><Icon>timer</Icon>Mean Time to Resolve (MTTR)</span><strong>38.6 hrs</strong></div>
                <div className="cp-division-grid">
                  <div><small>Fastest Division</small><strong>Sanitation & Waste</strong><b>14.2h MTTR</b></div>
                  <div><small>Longest Division</small><strong>Water Resources</strong><b>42.0h MTTR</b></div>
                </div>
                <button className="cp-secondary-button" onClick={() => notify("Target threshold configuration opened.")}><Icon>tune</Icon>Configure Target Thresholds</button>
              </div>
            </section>

            <section className="cp-secondary-grid">
              <div className="cp-panel cp-domain-panel">
                <div className="cp-panel-head"><div><h2>Distribution by Domain & Infrastructure</h2><p>Complaint volume categorized across municipal core assets</p></div><code>TOTAL: 2,481</code></div>
                <div className="cp-domain-list">
                  {domains.map(([icon, tone, name, count, pct]) => (
                    <div className="cp-domain-row" key={name}>
                      <div className="cp-domain-label"><span><Icon className={`cp-tone-${tone}`}>{icon}</Icon>{name}</span><b>{count}<em>{pct}%</em></b></div>
                      <div className="cp-bar"><span className={`cp-bar-${tone}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="cp-priority-title">Active Priority Breakdown (Open Queue: 684)</div>
                <div className="cp-priority-grid">
                  <div className="critical"><span>Critical <i /></span><strong>27</strong><small>3.9% of queue</small></div>
                  <div className="high"><span>High <i /></span><strong>184</strong><small>26.9% of queue</small></div>
                  <div className="medium"><span>Medium <i /></span><strong>312</strong><small>45.6% of queue</small></div>
                  <div className="low"><span>Low <i /></span><strong>161</strong><small>23.5% of queue</small></div>
                </div>
              </div>

              <div className="cp-panel cp-aging">
                <div className="cp-panel-head"><div><h2>Queue Aging Dynamics</h2><p>Duration tickets remain unresolved</p></div><span className="cp-open-badge">684 Open</span></div>
                <div className="cp-aging-stack"><span style={{width:"45%"}} /><span style={{width:"31%"}} /><span style={{width:"17%"}} /><span style={{width:"7%"}} /></div>
                <div className="cp-aging-axis"><span>0h</span><span>24h</span><span>72h</span><span>7 Days+</span></div>
                <div className="cp-aging-list">
                  {aging.map(([tone, title, desc, count, pct]) => (
                    <div className={`cp-aging-row ${tone}`} key={title}>
                      <div className="cp-aging-info"><i /><div><strong>{title}{tone === "error" && <b>Backlog Risk</b>}</strong><small>{desc}</small></div></div>
                      <div><strong>{count}</strong><small>{pct}</small></div>
                    </div>
                  ))}
                </div>
                <button className="cp-danger-button" onClick={() => notify("Opening 41 stagnant backlog tickets.")}><Icon>warning</Icon>Inspect 41 Stagnant Backlog Tickets</button>
              </div>
            </section>

            <section className="cp-panel cp-insights">
              <div className="cp-insights-head">
                <div className="cp-insights-title"><div><Icon>psychology</Icon></div><div><h2>Civic Intelligence Signals <span>Auto-Triage v4.2</span></h2><p>Algorithmic pattern recognition and preventive field guidance</p></div></div>
                <span className="cp-patterns"><i />4 high-confidence patterns identified</span>
              </div>
              <div className="cp-insight-grid">
                {insights.map((item) => (
                  <article className="cp-insight-card" key={item.code}>
                    <div>
                      <div className={`cp-insight-tag ${item.tone}`}><Icon>{item.icon}</Icon>{item.type}</div><code>{item.code}</code>
                      <h3>{item.title}</h3><p>{item.body}</p>
                    </div>
                    <div className="cp-directive"><small>Action Directive:</small><p>{item.action}</p></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="cp-panel cp-departments">
              <div className="cp-department-head">
                <div><h2>Department Performance & Field Velocity</h2><p>Detailed clearance metrics and SLA compliance across municipal divisions</p></div>
                <div><div className="cp-filter"><Icon>filter_list</Icon><input value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="Filter departments..." /></div><button className="cp-csv-button" onClick={downloadCSV}><Icon>file_download</Icon>CSV</button></div>
              </div>
              <div className="cp-table-wrap">
                <table>
                  <thead><tr><th>Department & Division</th><th>Open</th><th>Resolved</th><th>Avg MTTR</th><th>SLA Conformance</th><th>Status</th><th>30-Day Trend</th></tr></thead>
                  <tbody>
                    {filteredDepartments.map(([icon,tone,name,desc,open,resolved,mttr,sla,status,path]) => (
                      <tr key={name}>
                        <td><div className="cp-dept-name"><span className={`cp-dept-icon cp-tone-${tone}`}><Icon>{icon}</Icon></span><div><strong>{name}</strong><small>{desc}</small></div></div></td>
                        <td>{open}</td><td>{resolved}</td><td className={sla < 90 ? "cp-error-text" : mttr === "28.0h" ? "cp-teal-text" : ""}>{mttr}</td>
                        <td><div className="cp-sla-cell"><b className={sla < 90 ? "cp-error-text" : ""}>{sla.toFixed(1)}%</b><span><i style={{width:`${sla}%`}} /></span></div></td>
                        <td><span className={`cp-status ${status.includes("Warning") ? "warning" : status.includes("Exceeding") ? "exceeding" : ""}`}><i />{status}</span></td>
                        <td><Sparkline path={path} tone={sla < 90 ? "error" : tone === "primary" ? "secondary" : tone} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="cp-table-footer"><span>Displaying {filteredDepartments.length} of 12 active municipal field divisions</span><div><button onClick={() => notify("Already at first page.")}>Previous</button><button onClick={() => notify("Next department page selected.")}>Next</button></div></div>
            </section>
          </div>
        </main>
      </div>

      {toast && <div className="cp-analytics-toast"><Icon>check_circle</Icon>{toast}</div>}
    </div>
  );
}
