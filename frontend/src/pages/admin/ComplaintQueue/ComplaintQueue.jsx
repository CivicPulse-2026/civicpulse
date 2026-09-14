import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import "./ComplaintQueue.css";

const COMPLAINTS = [
  {
    id: "CP-2026-004821",
    title: "Streetlight near Gate 3 non-functional",
    detail: "Reported by Resident #8921 • Underground feeder trip",
    category: "Streetlight",
    icon: "lightbulb",
    categoryClass: "streetlight",
    location: "Gate 3, North Perimeter",
    priority: "HIGH",
    status: "IN PROGRESS",
    statusClass: "progress",
    assignee: "Rahul Sharma",
    initials: "RS",
    department: "Electrical Maint.",
    age: "7d ago",
    sla: "08h 42m",
    slaLabel: "APPROACHING",
    slaClass: "approaching",
  },
  {
    id: "CP-2026-004822",
    title: "Water supply interruption & pipe burst",
    detail: "Main pressure line cracked • Flooding roadway",
    category: "Water",
    icon: "water_drop",
    categoryClass: "water",
    location: "Ward 12, Sector 4",
    priority: "CRITICAL",
    status: "NEW",
    statusClass: "new",
    assignee: "Unassigned",
    initials: "--",
    department: "Water Resources",
    age: "2d ago",
    sla: "06h 12m",
    slaLabel: "CRITICAL SLA",
    slaClass: "critical",
    critical: true,
  },
  {
    id: "CP-2026-004823",
    title: "Garbage accumulation at market entrance",
    detail: "Overfilled commercial bins spillover",
    category: "Garbage",
    icon: "delete",
    categoryClass: "garbage",
    location: "Central Market Lane B",
    priority: "MEDIUM",
    status: "ASSIGNED",
    statusClass: "assigned",
    assignee: "Team 02",
    initials: "T2",
    department: "Sanitation Dept",
    age: "1d ago",
    sla: "31h 15m",
    slaLabel: "ON TRACK",
    slaClass: "on-track",
  },
  {
    id: "CP-2026-004824",
    title: "Deep pothole creating vehicle hazard",
    detail: "Southbound fast lane • Multiple tire puncture reports",
    category: "Road & Transit",
    icon: "commute",
    categoryClass: "road",
    location: "Ring Road Jct 9",
    priority: "HIGH",
    status: "IN PROGRESS",
    statusClass: "progress",
    assignee: "Asphalt Crew 1",
    initials: "AC",
    department: "Public Works",
    age: "3d ago",
    sla: "18h 30m",
    slaLabel: "ON TRACK",
    slaClass: "on-track",
  },
  {
    id: "CP-2026-004825",
    title: "Open storm drain grate near school",
    detail: "Immediate pedestrian fallback risk • Children route",
    category: "Safety Hazard",
    icon: "warning",
    categoryClass: "safety",
    location: "West Park Ave, Gate 2",
    priority: "CRITICAL",
    status: "ASSIGNED",
    statusClass: "assigned",
    assignee: "Eng. Miller",
    initials: "EM",
    department: "Civil Infra",
    age: "6h ago",
    sla: "03h 45m",
    slaLabel: "APPROACHING",
    slaClass: "critical-approaching",
  },
  {
    id: "CP-2026-004826",
    title: "Traffic signal timing desync during peak",
    detail: "Recalibrated cycle offset • Fixed telemetry link",
    category: "Road & Transit",
    icon: "traffic",
    categoryClass: "road",
    location: "Main St & 4th Ave",
    priority: "HIGH",
    status: "RESOLVED",
    statusClass: "resolved",
    assignee: "Team 09",
    initials: "T9",
    department: "Traffic Eng.",
    age: "4d ago",
    sla: "Verified Cleared",
    slaLabel: "",
    slaClass: "cleared",
    resolved: true,
  },
  {
    id: "CP-2026-004827",
    title: "Fallen tree branch blocking bike lane",
    detail: "Cleared and mulched on site • Pathway opened",
    category: "Parks & Forestry",
    icon: "park",
    categoryClass: "parks",
    location: "South Greenway Trail",
    priority: "LOW",
    status: "RESOLVED",
    statusClass: "resolved",
    assignee: "Field B Crew",
    initials: "FB",
    department: "Parks Dept",
    age: "5d ago",
    sla: "Verified Cleared",
    slaLabel: "",
    slaClass: "cleared",
    resolved: true,
  },
];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function ComplaintQueue() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("All Active");
  const [category, setCategory] = useState("All Categories");
  const [priority, setPriority] = useState("All Levels");
  const [department, setDepartment] = useState("Ward 4 Divisions");
  const [sla, setSla] = useState("Near Breach (14)");
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [view, setView] = useState("table");
  const [toast, setToast] = useState("");

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return COMPLAINTS.filter((item) => {
      const matchesQuery =
        !q ||
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(q)
        );

      const matchesStatus =
        status === "All Active" ||
        item.status === status.toUpperCase();

      const matchesCategory =
        category === "All Categories" || item.category === category;

      const matchesPriority =
        priority === "All Levels" || item.priority === priority;

      const matchesDepartment =
        department === "Ward 4 Divisions" ||
        item.department === department;

      const matchesSla =
        sla === "Near Breach (14)"
          ? true
          : sla === "All SLA"
            ? true
            : item.slaLabel === sla;

      const matchesDate =
        dateRange === "Last 7 Days" ? true : true;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesCategory &&
        matchesPriority &&
        matchesDepartment &&
        matchesSla &&
        matchesDate
      );
    });
  }, [query, status, category, priority, department, sla, dateRange]);

  const allSelected =
    filtered.length > 0 && filtered.every((item) => selected.includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((current) =>
        current.filter((id) => !filtered.some((item) => item.id === id))
      );
    } else {
      setSelected((current) => [
        ...new Set([...current, ...filtered.map((item) => item.id)]),
      ]);
    }
  };

  const toggleSelected = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const resetFilters = () => {
    setQuery("");
    setStatus("All Active");
    setCategory("All Categories");
    setPriority("All Levels");
    setDepartment("Ward 4 Divisions");
    setSla("Near Breach (14)");
    setDateRange("Last 7 Days");
    showToast("Filters reset");
  };

  const exportCsv = () => {
    const headers = [
      "Ticket ID",
      "Issue",
      "Category",
      "Location",
      "Priority",
      "Status",
      "Assignee",
      "Department",
      "Age",
      "SLA",
    ];

    const rows = filtered.map((item) => [
      item.id,
      item.title,
      item.category,
      item.location,
      item.priority,
      item.status,
      item.assignee,
      item.department,
      item.age,
      `${item.sla} ${item.slaLabel}`,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "civicpulse-complaints.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Complaint queue exported");
  };

  return (
    <>
      <AdminSidebar
        activeKey="complaints"
        onLogout={() => showToast("Sign out action selected.")}
      />

      <div className="cp-queue-shell">
        <header className="cp-queue-header">
          <div className="cp-queue-console">
            <Icon className="cp-queue-console-icon">tune</Icon>
            <span>Municipal Console</span>
            <span className="cp-queue-slash">/</span>
            <strong>Ward 4 Central Operations</strong>
          </div>

          <div className="cp-queue-global-search">
            <Icon>search</Icon>
            <input placeholder="Search tickets, assets, locations (Press ⌘K)..." />
            <kbd>⌘K</kbd>
          </div>

          <div className="cp-queue-header-actions">
            <div className="cp-queue-pipes">
              <span />
              <span>Dispatch Pipes Online</span>
            </div>

            <div className="cp-queue-divider" />

            <button className="cp-queue-icon-button" type="button">
              <Icon>notifications</Icon>
              <b>3</b>
            </button>

            <div className="cp-queue-profile">
              <div className="cp-queue-profile-avatar">
                <Icon>person</Icon>
              </div>
              <div>
                <strong>Rahul Sharma</strong>
                <span>Senior Dispatcher</span>
              </div>
            </div>
          </div>
        </header>

        <main className="cp-queue-main">
          <div className="cp-queue-content">
            <section className="cp-queue-page-heading">
              <div>
                <div className="cp-queue-title-line">
                  <h1>Complaint Queue</h1>
                  <span>Live Stream</span>
                </div>
                <p>Review, prioritize, and dispatch incoming municipal civic complaints.</p>
              </div>

              <div className="cp-queue-metrics">
                <div>
                  <i className="active" />
                  <span>Active Tickets:</span>
                  <strong>684</strong>
                </div>
                <div>
                  <i className="critical pulse" />
                  <span>Critical:</span>
                  <strong>27</strong>
                </div>
                <div>
                  <i className="amber" />
                  <span>Approaching SLA:</span>
                  <strong>14</strong>
                </div>
              </div>
            </section>

            <section className="cp-queue-toolbar">
              <div className="cp-queue-toolbar-top">
                <div className="cp-queue-search">
                  <Icon>search</Icon>
                  <input
                    id="ticket-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search complaints by ID, resident, street, or keyword (CP-2026-...)"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")}>
                      <Icon>close</Icon>
                    </button>
                  )}
                </div>

                <div className="cp-queue-actions">
                  <div className="cp-queue-view-toggle">
                    <button
                      className={view === "table" ? "selected" : ""}
                      type="button"
                      onClick={() => setView("table")}
                    >
                      <Icon>view_list</Icon>
                      <span>Table</span>
                    </button>
                    <button
                      className={view === "board" ? "selected" : ""}
                      type="button"
                      onClick={() => setView("board")}
                    >
                      <Icon>view_kanban</Icon>
                      <span>Board</span>
                    </button>
                  </div>

                  <button type="button" onClick={() => showToast(`${selected.length} ticket(s) selected for bulk assignment`)}>
                    <Icon>group_add</Icon>
                    <span>Bulk Assign</span>
                  </button>

                  <button type="button" onClick={exportCsv}>
                    <Icon>download</Icon>
                    <span>Export CSV</span>
                  </button>

                  <button className="fast-dispatch" type="button" onClick={() => showToast("Fast dispatch queue opened")}>
                    <Icon>send_time_extension</Icon>
                    <span>Fast Dispatch</span>
                  </button>
                </div>
              </div>

              <div className="cp-queue-filters">
                <span className="filter-label">Filters:</span>

                <Filter
                  label="Status:"
                  value={status}
                  options={["All Active", "New", "Assigned", "In Progress", "Resolved"]}
                  onChange={setStatus}
                />
                <Filter
                  label="Category:"
                  value={category}
                  options={["All Categories", "Streetlight", "Water", "Garbage", "Road & Transit", "Safety Hazard", "Parks & Forestry"]}
                  onChange={setCategory}
                />
                <Filter
                  label="Priority:"
                  value={priority}
                  options={["All Levels", "CRITICAL", "HIGH", "MEDIUM", "LOW"]}
                  onChange={setPriority}
                />
                <Filter
                  label="Department:"
                  value={department}
                  options={["Ward 4 Divisions", "Electrical Maint.", "Water Resources", "Sanitation Dept", "Public Works", "Civil Infra", "Traffic Eng.", "Parks Dept"]}
                  onChange={setDepartment}
                />
                <Filter
                  label="SLA:"
                  value={sla}
                  options={["Near Breach (14)", "All SLA", "APPROACHING", "ON TRACK", "CRITICAL SLA"]}
                  onChange={setSla}
                  accent
                />
                <Filter
                  label=""
                  value={dateRange}
                  options={["Last 7 Days", "Last 30 Days", "Today"]}
                  onChange={setDateRange}
                  icon="calendar_today"
                />

                <button className="reset" type="button" onClick={resetFilters}>
                  <Icon>restart_alt</Icon>
                  <span>Reset</span>
                </button>
              </div>
            </section>

            {view === "table" ? (
              <section className="cp-queue-table-card">
                <div className="cp-queue-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="check-col">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>Ticket ID</th>
                        <th>Issue Title & Details</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assignee / Dept</th>
                        <th>Age</th>
                        <th>SLA Countdown</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <ComplaintRow
                          key={item.id}
                          item={item}
                          selected={selected.includes(item.id)}
                          onSelect={() => toggleSelected(item.id)}
                          onToast={showToast}
                        />
                      ))}
                    </tbody>
                  </table>

                  {filtered.length === 0 && (
                    <div className="cp-queue-empty">
                      <Icon>search_off</Icon>
                      <strong>No complaints found</strong>
                      <span>Try adjusting your search or filters.</span>
                    </div>
                  )}
                </div>

                <div className="cp-queue-pagination">
                  <div>
                    <span>
                      Showing <strong>1-{filtered.length}</strong> of <strong>684</strong> complaints
                    </span>
                    <label>
                      Rows per page:
                      <select defaultValue="25">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                        <option>100</option>
                      </select>
                    </label>
                  </div>

                  <div className="pager">
                    <button disabled type="button">
                      <Icon>chevron_left</Icon>
                      <span>Previous</span>
                    </button>
                    <div>
                      <button className="current" type="button">1</button>
                      <button type="button">2</button>
                      <button type="button">3</button>
                      <span>...</span>
                      <button type="button">28</button>
                    </div>
                    <button type="button">
                      <span>Next</span>
                      <Icon>chevron_right</Icon>
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <BoardView complaints={filtered} />
            )}

            <section className="cp-queue-snapshot">
              <Snapshot icon="bolt" title="Auto-Triage Active">
                42 tickets routed via CivicSense automated ML engine
              </Snapshot>
              <Snapshot icon="speed" title="Mean SLA Velocity" tone="amber">
                Current: 4h 12m (Ward 4 average is -18m below ceiling)
              </Snapshot>
              <Snapshot icon="task" title="Daily Clearance Rate" tone="green">
                94.2% resolution efficiency across municipal departments
              </Snapshot>
            </section>
          </div>
        </main>

        {toast && <div className="cp-queue-toast">{toast}</div>}
      </div>
    </>
  );
}

function Filter({ label, value, options, onChange, accent = false, icon }) {
  return (
    <label className={`cp-queue-filter ${accent ? "accent" : ""}`}>
      {icon && <Icon>{icon}</Icon>}
      {label && <span>{label}</span>}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <Icon>expand_more</Icon>
    </label>
  );
}

function ComplaintRow({ item, selected, onSelect, onToast }) {
  return (
    <tr className={`${item.critical ? "critical-row" : ""} ${item.resolved ? "resolved-row" : ""}`}>
      <td className="check-col">
        <input type="checkbox" checked={selected} onChange={onSelect} />
      </td>
      <td>
        <div className="queue-id">
          <span>{item.id}</span>
          <button type="button" title="Copy ID" onClick={() => navigator.clipboard?.writeText(item.id).then(() => onToast("Ticket ID copied"))}>
            <Icon>content_copy</Icon>
          </button>
        </div>
      </td>
      <td className="issue-cell">
        <div>
          <strong>{item.title}</strong>
          <span>{item.detail}</span>
        </div>
      </td>
      <td>
        <span className={`category-chip ${item.categoryClass}`}>
          <Icon>{item.icon}</Icon>
          <span>{item.category}</span>
        </span>
      </td>
      <td>
        <div className="location-cell">
          <Icon>location_on</Icon>
          <span>{item.location}</span>
        </div>
      </td>
      <td>
        <span className={`priority-chip ${item.priority.toLowerCase()}`}>{item.priority}</span>
      </td>
      <td>
        <span className={`status-chip ${item.statusClass}`}>
          <i />
          <span>{item.status}</span>
        </span>
      </td>
      <td>
        <div className="assignee-cell">
          <div className={`assignee-avatar ${item.resolved ? "muted" : ""}`}>{item.initials}</div>
          <div>
            <strong>{item.assignee}</strong>
            <span>{item.department}</span>
          </div>
        </div>
      </td>
      <td>
        <span className={`age ${item.critical ? "critical-age" : ""}`}>{item.age}</span>
      </td>
      <td>
        <span className={`sla-chip ${item.slaClass}`}>
          <Icon>{item.slaLabel === "CRITICAL SLA" ? "timer_off" : item.slaLabel === "Verified Cleared" ? "task_alt" : "alarm"}</Icon>
          <span>{item.sla}</span>
          {item.slaLabel && <b>{item.slaLabel}</b>}
        </span>
      </td>
      <td className="actions-col">
        <div className="row-actions">
          {item.resolved ? (
            <button type="button" onClick={() => onToast(`${item.id} archived`)}>Archive</button>
          ) : item.critical && item.status === "NEW" ? (
            <button className="dispatch" type="button" onClick={() => onToast(`Dispatch initiated for ${item.id}`)}>Dispatch Now</button>
          ) : (
            <Link to={`/admin/complaints/${item.id}`}>View</Link>
          )}
          <button type="button" onClick={() => onToast(`Actions opened for ${item.id}`)}>
            <Icon>more_vert</Icon>
          </button>
        </div>
      </td>
    </tr>
  );
}

function BoardView({ complaints }) {
  const groups = ["NEW", "ASSIGNED", "IN PROGRESS", "RESOLVED"];
  return (
    <section className="cp-queue-board">
      {groups.map((group) => (
        <div key={group} className="board-column">
          <header>
            <strong>{group}</strong>
            <span>{complaints.filter((item) => item.status === group).length}</span>
          </header>
          {complaints.filter((item) => item.status === group).map((item) => (
            <Link key={item.id} to={`/admin/complaints/${item.id}`} className="board-card">
              <span>{item.priority}</span>
              <strong>{item.title}</strong>
              <small>{item.id}</small>
              <small>{item.location}</small>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}

function Snapshot({ icon, title, tone = "", children }) {
  return (
    <div className={`cp-queue-snapshot-card ${tone}`}>
      <div className="snapshot-icon">
        <Icon>{icon}</Icon>
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
