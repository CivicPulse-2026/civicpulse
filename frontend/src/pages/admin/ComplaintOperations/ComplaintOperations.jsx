import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { adminService } from "../../../lib/services";
import { assetUrl } from "../../../lib/apiClient";
import { useAuth } from "../../../context/AuthContext";
import "./ComplaintOperations.css";

// Backend Status -> the transitions the officer can pick next (mirrors STATUS_TRANSITIONS).
const STATUS_OPTIONS = ["New", "Assigned", "In Progress", "Resolved", "Reopened"];

// Lifecycle stepper order.
const PIPELINE = ["New", "Assigned", "In Progress", "Resolved"];

function fmt(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ComplaintOperations() {
  const { id } = useParams();
  const { user, logout } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [copied, setCopied] = useState(false);
  const [statusChoice, setStatusChoice] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("internal");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicPulseToast);
    window.__civicPulseToast = window.setTimeout(() => setToast(""), 2600);
  };

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await adminService.getComplaint(id);
      setComplaint(res.complaint);
      setComments(res.comments || []);
      setAudit((res.audit || []).slice().reverse());
      setNotes(res.notes || []);
      setStatusChoice(res.complaint?.status || "");
    } catch (err) {
      setLoadError(err?.message || "Could not load this complaint.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const ticketId = complaint?.ticket_id || id;

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketId);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const postNote = async () => {
    if (!note.trim()) {
      showToast("Write a note before posting.");
      return;
    }
    const text = note.trim();
    setNote("");
    try {
      if (tab === "public") {
        await adminService.notify(id, text);
        showToast("Citizen notification sent.");
      } else {
        await adminService.addNote(id, text, "internal");
        const res = await adminService.notes(id);
        setNotes(res.notes || []);
        showToast("Internal operational note posted.");
      }
    } catch (err) {
      showToast(err?.message || "Could not post note.");
    }
  };

  const updateStatus = async () => {
    if (!statusChoice || statusChoice === complaint.status) {
      showToast("Pick a different status to transition.");
      return;
    }
    setBusy(true);
    try {
      await adminService.updateStatus(id, statusChoice);
      showToast(`Lifecycle updated to ${statusChoice}.`);
      await load();
    } catch (err) {
      showToast(err?.message || "Status transition rejected.");
    } finally {
      setBusy(false);
    }
  };

  const reassign = async () => {
    const assignee = window.prompt("Assign to:", complaint?.assigned_to || "");
    if (!assignee) return;
    setBusy(true);
    try {
      await adminService.assign(id, assignee);
      showToast(`Assigned to ${assignee}.`);
      await load();
    } catch (err) {
      showToast(err?.message || "Assignment failed.");
    } finally {
      setBusy(false);
    }
  };

  const dispatchCrew = async () => {
    const crew = window.prompt("Dispatch crew:", complaint?.crew || "");
    if (!crew) return;
    setBusy(true);
    try {
      await adminService.dispatch(id, crew);
      showToast(`Dispatched ${crew}.`);
      await load();
    } catch (err) {
      showToast(err?.message || "Dispatch failed.");
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    const reason = window.prompt("Escalation reason:");
    if (!reason) return;
    setBusy(true);
    try {
      await adminService.escalate(id, reason);
      showToast("Escalation logged, priority raised.");
      await load();
    } catch (err) {
      showToast(err?.message || "Escalation failed.");
    } finally {
      setBusy(false);
    }
  };

  const factors = complaint?.factors || {};
  const factorRows = useMemo(
    () =>
      Object.entries(factors).map(([k, v]) => ({
        text: k.replace(/_/g, " "),
        points: typeof v === "number" ? `${v > 0 ? "+" : ""}${v} pts` : String(v),
      })),
    [factors]
  );

  const auditJson = useMemo(
    () =>
      JSON.stringify(
        {
          ticket_id: ticketId,
          status: complaint?.status,
          priority: complaint?.priority,
          priority_score: complaint?.priority_score,
          category: complaint?.category,
          generated_at: new Date().toISOString(),
          events: audit.map((e) => ({ time: e.created_at, code: e.action, message: e.detail, actor: e.actor_name })),
        },
        null,
        2
      ),
    [ticketId, complaint, audit]
  );

  const exportAudit = () => {
    const blob = new Blob([auditJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${ticketId}-audit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Audit JSON exported.");
  };

  const handleLogout = () => {
    logout();
    window.location.assign("/auth/login");
  };

  if (loading) {
    return (
      <div className="cp-ops-page">
        <AdminSidebar activeKey="complaints" user={user} onLogout={handleLogout} />
        <div className="cp-ops-shell" style={{ display: "grid", placeItems: "center", color: "#64748b" }}>
          Loading complaint operations…
        </div>
      </div>
    );
  }

  if (loadError || !complaint) {
    return (
      <div className="cp-ops-page">
        <AdminSidebar activeKey="complaints" user={user} onLogout={handleLogout} />
        <div className="cp-ops-shell" style={{ display: "grid", placeItems: "center", color: "var(--error, #ba1a1a)" }}>
          {loadError || "Complaint not found."}
        </div>
      </div>
    );
  }

  const loc = complaint.location || {};
  const photos = complaint.photos || [];
  const currentStep = PIPELINE.indexOf(complaint.status);

  return (
    <div className="cp-ops-page">
      <AdminSidebar activeKey="complaints" user={user} onLogout={handleLogout} />

      <div className="cp-ops-shell">
        <header className="cp-ops-header">
          <div className="cp-ops-console">
            <Icon name="tune" />
            <span>Municipal Console</span>
            <em>/</em>
            <strong>Central Operations</strong>
          </div>

          <div className="cp-ops-search">
            <Icon name="search" />
            <input placeholder="Search tickets, assets, locations (Press ⌘K)..." />
            <kbd>⌘K</kbd>
          </div>

          <div className="cp-ops-header-right">
            <div className="cp-ops-dispatch">
              <span />
              Dispatch Pipes Online
            </div>
            <div className="cp-ops-divider" />
            <button className="cp-ops-notification" onClick={() => showToast("3 notifications available.")}>
              <Icon name="notifications" />
              <b>3</b>
            </button>
            <div className="cp-ops-header-profile">
              <div className="cp-ops-avatar"><Icon name="person" /></div>
              <div>
                <strong>{user?.name || "Municipal User"}</strong>
                <small>{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Staff"}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="cp-ops-main">
          <section className="cp-ops-command">
            <div className="cp-ops-command-inner">
              <div className="cp-ops-breadcrumb-row">
                <div className="cp-ops-breadcrumb">
                  <Link to="/admin/complaints">Complaints</Link>
                  <span>/</span>
                  <code>{ticketId}</code>
                  <span>/</span>
                  <strong>Operations Command</strong>
                </div>
                <div className="cp-ops-link-state">
                  <span />
                  {complaint.department || "Unassigned dept"}
                  <i>|</i>
                  {loc.ward || "Sector —"}
                </div>
              </div>

              <div className="cp-ops-title-row">
                <div className="cp-ops-title-area">
                  <div className="cp-ops-title-line">
                    <h1>{complaint.description}</h1>
                    <div className="cp-ops-ticket">
                      <code>{ticketId}</code>
                      <button onClick={copyTicket} title="Copy Ticket Reference">
                        <Icon name={copied ? "check" : "content_copy"} />
                      </button>
                    </div>
                  </div>
                  <div className="cp-ops-badges">
                    <span className="cp-ops-status"><i /> {complaint.status?.toUpperCase()}</span>
                    <span className="cp-ops-priority"><Icon name="bolt" /> {complaint.priority} · {complaint.priority_score}/100</span>
                    <span className="cp-ops-category"><Icon name="lightbulb" /> {complaint.category}</span>
                    <span className="cp-ops-source"><Icon name="sensors" /> {complaint.reporter_name || "Citizen"}</span>
                  </div>
                </div>

                <div className="cp-ops-actions">
                  <button onClick={() => window.print()}><Icon name="print" /><span>Print Work Order</span></button>
                  <button onClick={() => { setTab("public"); showToast("Compose a citizen update below."); }}><Icon name="notifications_active" /><span>Notify Citizen</span></button>
                  <button className="danger-action" onClick={escalate} disabled={busy}><Icon name="emergency" /><span>Escalate</span></button>
                  <button className="primary-action" onClick={updateStatus} disabled={busy}><Icon name="save" /><span>Save Status</span></button>
                </div>
              </div>
            </div>
          </section>

          <div className="cp-ops-content">
            <div className="cp-ops-grid">
              <div className="cp-ops-col">
                <Card icon="record_voice_over" title="Citizen Ingest" badge={complaint.reporter_contact || "No contact"}>
                  <div className="cp-ops-quote">
                    <Icon name="format_quote" />
                    <p>{complaint.description}</p>
                  </div>
                  <div className="cp-ops-meta-grid">
                    <Meta label="Reporter" value={complaint.reporter_name || "Anonymous"} sub="Citizen submission" verified />
                    <Meta label="Logged Timestamp" value={fmt(complaint.created_at)} sub="Web Portal" />
                  </div>
                  <div className="cp-ops-evidence">
                    <div className="cp-ops-section-label-row">
                      <span>Field Photographic Evidence</span>
                      <code>{photos.length} Attachment(s)</code>
                    </div>
                    <div className="cp-ops-photo-grid">
                      {photos.map((src, i) => (
                        <div className="cp-ops-photo" key={i}>
                          <img src={assetUrl(src)} alt={`Attachment ${i + 1}`} />
                          <div className="cp-ops-photo-overlay">
                            <strong>Attachment {i + 1}</strong>
                          </div>
                        </div>
                      ))}
                      {photos.length === 0 && <p className="cp-ops-muted">No photos attached.</p>}
                    </div>
                  </div>
                </Card>

                <Card icon="psychology" iconClass="blue" title="AI Classification Engine" badge="Rule + LLM Hybrid" badgeClass="dark">
                  <div className="cp-ops-ai-grid">
                    <Meta
                      label="Inferred Category"
                      value={complaint.ai_analysis?.category || complaint.category}
                      sub="AI classification"
                      verified
                    />

                    <Meta
                      label="Detected Landmark"
                      value={complaint.ai_analysis?.location || loc.address || "—"}
                    />
                    <Meta label="Priority Band" value={complaint.priority} danger={complaint.priority === "CRITICAL" || complaint.priority === "HIGH"} />
                    <Meta label="Similar Reports" value={`${complaint.similar_count ?? 0} nearby`} dangerDot={!!complaint.similar_count} />
                  </div>
                </Card>

                <Card icon="layers" iconClass="green" title="GIS Infrastructure Topology" badge={loc.ward || "SECTOR"} badgeClass="plain">
                  <div className="cp-ops-map">
                    <div className="cp-ops-map-bg" />
                    <div className="cp-ops-map-overlay">
                      <code>GPS: {loc.lat != null ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : "n/a"}</code>
                      <span><i /> {complaint.category}</span>
                    </div>
                    <div className="cp-ops-map-hud">
                      <div>
                        <strong>{loc.address || "Reported location"}</strong>
                      </div>
                      <button onClick={() => window.location.assign("/admin/map")}>Full GIS</button>
                    </div>
                  </div>
                </Card>

                <Card icon="forum" title="Notes & Communication">
                  <div className="cp-ops-tabbar">
                    <button className={tab === "internal" ? "active" : ""} onClick={() => setTab("internal")}>Internal Ops</button>
                    <button className={tab === "public" ? "active" : ""} onClick={() => setTab("public")}>Citizen (Public)</button>
                  </div>
                  <div className="cp-ops-thread">
                    {tab === "internal" ? (
                      notes.length ? notes.map((n, i) => (
                        <Thread key={i} author={n.author_name || "Officer"} time={fmt(n.created_at)}>{n.text}</Thread>
                      )) : <p className="cp-ops-muted">No internal notes yet.</p>
                    ) : (
                      comments.length ? comments.map((c, i) => (
                        <Thread key={i} author={c.author_name || "Citizen"} time={fmt(c.created_at)}>{c.text}</Thread>
                      )) : <p className="cp-ops-muted">No citizen messages yet.</p>
                    )}
                  </div>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={tab === "internal" ? "Add internal operational note..." : "Message the citizen (sent as a notification)..."} rows={2} />
                  <div className="cp-ops-note-footer">
                    <div />
                    <button onClick={postNote}>{tab === "internal" ? "Post Note" : "Send Update"}</button>
                  </div>
                </Card>
              </div>

              <div className="cp-ops-col">
                <Card icon="speed" title="Priority Engine" badge="ALGO_v4.2" badgeClass="danger">
                  <div className="cp-ops-score">
                    <div>
                      <span>Dynamic Score</span>
                      <strong>{complaint.priority_score}<small>/100</small></strong>
                      <b>{complaint.priority}</b>
                    </div>
                    <div className="cp-ops-gauge">
                      <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" />
                        <circle className="progress" cx="18" cy="18" r="15.915" style={{ strokeDasharray: `${complaint.priority_score}, 100` }} />
                      </svg>
                      <Icon name="priority_high" />
                    </div>
                  </div>
                  <span className="cp-ops-section-label">Calculation Breakdown</span>
                  <div className="cp-ops-breakdown">
                    {factorRows.length ? factorRows.map((f) => (
                      <ScoreRow key={f.text} text={f.text} points={f.points} />
                    )) : <p className="cp-ops-muted">No factor breakdown available.</p>}
                  </div>
                </Card>

                <Card icon="timer" title="SLA Enforcement">
                  <div className="cp-ops-sla-badge"><i /> {complaint.status === "Resolved" ? "RESOLVED" : "ACTIVE"}</div>
                  <div className="cp-ops-sla-box">
                    <div className="cp-ops-sla-time"><span>SLA Due</span><strong>{fmt(complaint.sla_due_at) || "—"}</strong></div>
                    <div className="cp-ops-sla-meta"><span>Logged: {fmt(complaint.created_at)}</span><span>Dept: {complaint.department || "—"}</span></div>
                  </div>
                </Card>

                <Card icon="engineering" title="Dispatch Assignment" rightIcon="verified">
                  <div className="cp-ops-assignment">
                    <Assignment label="Department" value={complaint.department || "Unassigned"} action="Reassign" onAction={reassign} />
                    <Assignment label="Assigned To" value={complaint.assigned_to || "Unassigned"} initials={(complaint.assigned_to || "NA").slice(0, 2).toUpperCase()} action="Change" onAction={reassign} />
                    <Assignment label="Field Crew" value={complaint.crew || "None dispatched"} truck action="Dispatch" onAction={dispatchCrew} />
                  </div>
                </Card>

                <Card icon="linear_scale" title="Lifecycle Pipeline" badge={`STAGE ${Math.max(1, currentStep + 1)} OF 4`} badgeClass="plain">
                  <div className="cp-ops-pipeline">
                    <div className="cp-ops-pipeline-line"><span /></div>
                    {PIPELINE.map((step, index) => (
                      <div className={`cp-ops-step ${index < currentStep ? "done" : index === currentStep ? "current" : ""}`} key={step}>
                        <div>{index < currentStep ? "✓" : index === currentStep ? "●" : index + 1}</div>
                        <span>{step.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                  <label className="cp-ops-select-label">Change Lifecycle State</label>
                  <select value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>Status: {s}</option>
                    ))}
                  </select>
                  <button className="cp-ops-update-status" onClick={updateStatus} disabled={busy}>
                    <Icon name="verified_user" /> Update Status & Log Transition
                  </button>
                </Card>
              </div>

              <div className="cp-ops-col">
                <Card icon="history_edu" title="Audit Ledger" rightIcon="lock">
                  <div className="cp-ops-audit">
                    {audit.length ? audit.map((e, i) => (
                      <div className="cp-ops-audit-event" key={i}>
                        <span className="tone-primary" />
                        <div className="cp-ops-audit-top"><b>{fmt(e.created_at)}</b><strong className="tone-text-primary">{e.action?.replace(/_/g, " ").toUpperCase()}</strong></div>
                        <p>{e.detail}</p>
                        {e.actor_name && <code>{e.actor_name}</code>}
                      </div>
                    )) : <p className="cp-ops-muted">No audit events.</p>}
                  </div>
                  <button className="cp-ops-export" onClick={exportAudit}><Icon name="download" /> Export Audit JSON</button>
                </Card>

                <Card icon="hub" title="Similar Reports" badge={`${complaint.similar_count ?? 0} NEARBY`} badgeClass="plain">
                  <p className="cp-ops-muted">
                    The deduplication engine found {complaint.similar_count ?? 0} similar report(s) near this location.
                  </p>
                  <button className="cp-ops-text-button" onClick={() => window.location.assign("/admin/map")}>Open cluster map</button>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && <div className="cp-ops-toast"><Icon name="check_circle" /> {toast}</div>}
    </div>
  );
}

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

function Card({ icon, iconClass = "", title, badge, badgeClass = "", rightIcon, children }) {
  return (
    <section className="cp-ops-card">
      <div className="cp-ops-card-heading">
        <div><Icon name={icon} /><h2>{title}</h2></div>
        {badge && <span className={`cp-ops-card-badge ${badgeClass}`}>{badge}</span>}
        {rightIcon && <Icon name={rightIcon} />}
      </div>
      {children}
    </section>
  );
}

function Meta({ label, value, sub, verified, danger, dangerDot }) {
  return (
    <div className="cp-ops-meta">
      <span>{label}</span>
      <div className={danger ? "danger-value" : ""}>
        {dangerDot && <i />}
        <strong>{value}</strong>
        {verified && <small>{sub}</small>}
      </div>
      {!verified && sub && <small>{sub}</small>}
    </div>
  );
}

function Thread({ author, time, children }) {
  return (
    <div className="cp-ops-thread-item">
      <div><strong>{author}</strong><code>{time}</code></div>
      <p>{children}</p>
    </div>
  );
}

function ScoreRow({ text, points }) {
  return (
    <div className="cp-ops-score-row">
      <span><Icon name="check_circle" /> {text}</span>
      <code>{points}</code>
    </div>
  );
}

function Assignment({ label, value, sub, initials, truck, action, onAction }) {
  return (
    <div className="cp-ops-assignment-row">
      <div className="cp-ops-assignment-person">
        {initials ? <b className="cp-ops-assignment-avatar">{initials}</b> : truck ? <b className="cp-ops-assignment-avatar truck"><Icon name="local_shipping" /></b> : null}
        <div><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
      </div>
      <button onClick={onAction}>{action}</button>
    </div>
  );
}
