import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { adminService, analyticsService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./ComplaintQueue.css";

// Map backend Category enum -> UI icon + chip class.
const CATEGORY_META = {
  "Street Light": { icon: "lightbulb", class: "streetlight" },
  "Pothole": { icon: "commute", class: "road" },
  "Water / Drainage": { icon: "water_drop", class: "water" },
  "Garbage / Sanitation": { icon: "delete", class: "garbage" },
  "Noise": { icon: "graphic_eq", class: "safety" },
  "Graffiti": { icon: "format_paint", class: "parks" },
  "Traffic Signal": { icon: "traffic", class: "road" },
  "Parks / Trees": { icon: "park", class: "parks" },
  "Other": { icon: "more_horiz", class: "safety" },
};

// Map backend Status -> chip class + display label.
const STATUS_META = {
  "New": { class: "new", label: "NEW" },
  "Assigned": { class: "assigned", label: "ASSIGNED" },
  "In Progress": { class: "progress", label: "IN PROGRESS" },
  "Resolved": { class: "resolved", label: "RESOLVED" },
  "Reopened": { class: "new", label: "REOPENED" },
};

const PAGE_SIZE = 25;

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function initials(name) {
  if (!name) return "--";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function ageFrom(dt) {
  if (!dt) return "";
  const diff = Date.now() - new Date(dt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
}

// Compute an SLA countdown chip from sla_due_at + status.
function slaChip(complaint) {
  if (complaint.status === "Resolved") {
    return { sla: "Verified Cleared", slaLabel: "", slaClass: "cleared" };
  }
  const due = complaint.sla_due_at ? new Date(complaint.sla_due_at).getTime() : null;
  if (!due) return { sla: "No SLA", slaLabel: "", slaClass: "on-track" };
  const ms = due - Date.now();
  if (ms <= 0) return { sla: "Overdue", slaLabel: "BREACHED", slaClass: "critical" };
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const label = `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
  if (hrs < 8) return { sla: label, slaLabel: "APPROACHING", slaClass: "approaching" };
  return { sla: label, slaLabel: "ON TRACK", slaClass: "on-track" };
}

// Adapt a backend complaint document into the shape this table renders.
function toRow(c) {
  const cat = CATEGORY_META[c.category] || CATEGORY_META.Other;
  const st = STATUS_META[c.status] || { class: "new", label: c.status?.toUpperCase() };
  const loc = c.location || {};
  return {
    id: c.id,
    ticket: c.ticket_id,
    title: c.description,
    detail: `${c.category} • ${c.reporter_name || "Citizen"}`,
    category: c.category,
    icon: cat.icon,
    categoryClass: cat.class,
    location: loc.address || (loc.lat != null ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : "—"),
    priority: c.priority,
    status: st.label,
    statusClass: st.class,
    assignee: c.assigned_to || "Unassigned",
    initials: initials(c.assigned_to),
    department: c.department || "—",
    age: ageFrom(c.created_at),
    critical: c.priority === "CRITICAL",
    resolved: c.status === "Resolved",
    ...slaChip(c),
  };
}

const STATUS_OPTIONS = ["All Active", "New", "Assigned", "In Progress", "Resolved", "Reopened"];
const CATEGORY_OPTIONS = ["All Categories", ...Object.keys(CATEGORY_META)];
const PRIORITY_OPTIONS = ["All Levels", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function ComplaintQueue() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("All Active");
  const [category, setCategory] = useState("All Categories");
  const [priority, setPriority] = useState("All Levels");
  const [view, setView] = useState("table");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2200);
  };

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, category, priority]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: status === "All Active" ? undefined : status,
        category: category === "All Categories" ? undefined : category,
        priority: priority === "All Levels" ? undefined : priority,
        q: debouncedQuery || undefined,
        page,
        page_size: PAGE_SIZE,
      };
      const res = await adminService.listComplaints(params);
      setRows((res.items || []).map(toRow));
      setTotal(res.total || 0);
    } catch (err) {
      showToast(err?.message || "Could not load complaints.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, category, priority, debouncedQuery, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    analyticsService.dashboardStats().then(setStats).catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  const allSelected = rows.length > 0 && rows.every((item) => selected.includes(item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((current) => current.filter((id) => !rows.some((item) => item.id === id)));
    } else {
      setSelected((current) => [...new Set([...current, ...rows.map((item) => item.id)])]);
    }
  };

  const toggleSelected = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const resetFilters = () => {
    setQuery("");
    setStatus("All Active");
    setCategory("All Categories");
    setPriority("All Levels");
    showToast("Filters reset");
  };

  const bulkAssign = async () => {
    if (selected.length === 0) {
      showToast("Select at least one ticket first.");
      return;
    }
    const assignee = window.prompt("Assign selected tickets to:");
    if (!assignee) return;
    try {
      await adminService.bulkAssign(selected, assignee);
      showToast(`${selected.length} ticket(s) assigned to ${assignee}`);
      setSelected([]);
      load();
    } catch (err) {
      showToast(err?.message || "Bulk assign failed.");
    }
  };

  const exportCsv = () => {
    const headers = ["Ticket ID", "Issue", "Category", "Location", "Priority", "Status", "Assignee", "Department", "Age", "SLA"];
    const data = rows.map((item) => [
      item.ticket, item.title, item.category, item.location, item.priority,
      item.status, item.assignee, item.department, item.age, `${item.sla} ${item.slaLabel}`,
    ]);
    const csv = [headers, ...data]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
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

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const openCount = stats ? stats.total - stats.resolved : null;

  return (
    <>
      <AdminSidebar activeKey="complaints" user={user} onLogout={handleLogout} />

      <div className="cp-queue-shell">
        <header className="cp-queue-header">
          <div className="cp-queue-console">
            <Icon className="cp-queue-console-icon">tune</Icon>
            <span>Municipal Console</span>
            <span className="cp-queue-slash">/</span>
            <strong>Central Operations</strong>
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
                <strong>{user?.name || "Municipal User"}</strong>
                <span>{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Staff"}</span>
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
                  <strong>{openCount ?? "—"}</strong>
                </div>
                <div>
                  <i className="critical pulse" />
                  <span>Critical:</span>
                  <strong>{stats?.critical ?? "—"}</strong>
                </div>
                <div>
                  <i className="amber" />
                  <span>Overdue:</span>
                  <strong>{stats?.overdue ?? "—"}</strong>
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
                    placeholder="Search complaints by ID, resident, street, or keyword (CP-...)"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")}>
                      <Icon>close</Icon>
                    </button>
                  )}
                </div>

                <div className="cp-queue-actions">
                  <div className="cp-queue-view-toggle">
                    <button className={view === "table" ? "selected" : ""} type="button" onClick={() => setView("table")}>
                      <Icon>view_list</Icon>
                      <span>Table</span>
                    </button>
                    <button className={view === "board" ? "selected" : ""} type="button" onClick={() => setView("board")}>
                      <Icon>view_kanban</Icon>
                      <span>Board</span>
                    </button>
                  </div>

                  <button type="button" onClick={bulkAssign}>
                    <Icon>group_add</Icon>
                    <span>Bulk Assign{selected.length ? ` (${selected.length})` : ""}</span>
                  </button>

                  <button type="button" onClick={exportCsv}>
                    <Icon>download</Icon>
                    <span>Export CSV</span>
                  </button>

                  <button className="fast-dispatch" type="button" onClick={() => navigate("/admin/map")}>
                    <Icon>send_time_extension</Icon>
                    <span>City Map</span>
                  </button>
                </div>
              </div>

              <div className="cp-queue-filters">
                <span className="filter-label">Filters:</span>
                <Filter label="Status:" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
                <Filter label="Category:" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                <Filter label="Priority:" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} accent />
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
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
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
                      {rows.map((item) => (
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

                  {!loading && rows.length === 0 && (
                    <div className="cp-queue-empty">
                      <Icon>search_off</Icon>
                      <strong>No complaints found</strong>
                      <span>Try adjusting your search or filters.</span>
                    </div>
                  )}
                  {loading && (
                    <div className="cp-queue-empty">
                      <Icon>hourglass_top</Icon>
                      <strong>Loading complaints…</strong>
                    </div>
                  )}
                </div>

                <div className="cp-queue-pagination">
                  <div>
                    <span>
                      Showing <strong>{startIndex}-{endIndex}</strong> of <strong>{total}</strong> complaints
                    </span>
                  </div>

                  <div className="pager">
                    <button disabled={page <= 1} type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <Icon>chevron_left</Icon>
                      <span>Previous</span>
                    </button>
                    <div>
                      <button className="current" type="button">{page}</button>
                      <span>of {totalPages}</span>
                    </div>
                    <button disabled={page >= totalPages} type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      <span>Next</span>
                      <Icon>chevron_right</Icon>
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <BoardView complaints={rows} />
            )}
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
          <span>{item.ticket}</span>
          <button type="button" title="Copy ID" onClick={() => navigator.clipboard?.writeText(item.ticket).then(() => onToast("Ticket ID copied"))}>
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
          <Icon>{item.slaLabel === "BREACHED" ? "timer_off" : item.resolved ? "task_alt" : "alarm"}</Icon>
          <span>{item.sla}</span>
          {item.slaLabel && <b>{item.slaLabel}</b>}
        </span>
      </td>
      <td className="actions-col">
        <div className="row-actions">
          <Link to={`/admin/complaints/${item.id}`}>View</Link>
          <button type="button" onClick={() => onToast(`Ticket ${item.ticket}`)}>
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
              <small>{item.ticket}</small>
              <small>{item.location}</small>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
