import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { complaintService } from "../../../lib/services";
import { assetUrl } from "../../../lib/apiClient";
import { useAuth } from "../../../context/AuthContext";
import "./ComplaintTracking.css";

// Ordered lifecycle stages used to render the pipeline stepper.
const PIPELINE = [
  { key: "New", title: "Reported", icon: "check" },
  { key: "Assigned", title: "Assigned", icon: "assignment_ind" },
  { key: "In Progress", title: "In Progress", icon: "engineering" },
  { key: "Resolved", title: "Resolved", icon: "task_alt" },
];

const STATUS_ORDER = ["New", "Assigned", "In Progress", "Resolved"];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

// Shown when a ticket lookup fails (or a bad/placeholder ID is opened).
// Lets the citizen type their real tracking ID instead of hitting a dead end.
function TrackLookup({ message, currentId }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const go = (e) => {
    e.preventDefault();
    const id = value.trim();
    if (id) navigate(`/citizen/complaints/${encodeURIComponent(id)}`);
  };

  return (
    <div className="cp-ct-lookup">
      <div className="cp-ct-lookup-icon">
        <Icon>search</Icon>
      </div>
      <h1>Track a complaint</h1>
      <p>{message}</p>
      {currentId && (
        <p className="cp-ct-lookup-hint">
          You looked up <code>{currentId}</code>. Double-check the ID from your
          submission receipt.
        </p>
      )}
      <form onSubmit={go} className="cp-ct-lookup-form">
        <div className="cp-ct-lookup-input">
          <Icon>confirmation_number</Icon>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. CP-2026-000001"
            aria-label="Complaint tracking ID"
            autoFocus
          />
        </div>
        <button type="submit" disabled={!value.trim()}>
          Track <Icon>arrow_forward</Icon>
        </button>
      </form>
      <button className="cp-ct-lookup-report" onClick={() => navigate("/citizen/report")}>
        Or report a new issue
      </button>
    </div>
  );
}

function fmt(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dt) {
  if (!dt) return "";
  const then = new Date(dt).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m ago`;
}

function Breadcrumb({ ticketId, title, onCopy, copied }) {
  return (
    <div className="cp-ct-topbar">
      <div className="cp-ct-breadcrumb">
        <a href="/" className="cp-ct-back-link">
          <Icon>arrow_back</Icon>
          Complaints
        </a>
        <span className="cp-ct-slash">/</span>
        <span className="cp-ct-ticket-code">{ticketId}</span>
        <span className="cp-ct-slash">/</span>
        <span className="cp-ct-breadcrumb-title">{title}</span>
      </div>

      <div className="cp-ct-actions">
        <button className="cp-ct-utility-btn" onClick={onCopy}>
          <Icon>content_copy</Icon>
          <span>{copied ? "Copied" : "Copy ID"}</span>
        </button>
        <button className="cp-ct-utility-btn">
          <Icon>share</Icon>
          <span>Share</span>
        </button>
        <button className="cp-ct-utility-btn">
          <Icon>print</Icon>
          <span className="cp-ct-print-label">Print</span>
        </button>
        <button className="cp-ct-sms-btn">
          <Icon>notifications_active</Icon>
          <span className="cp-ct-sms-label">SMS Alerts</span>
        </button>
      </div>
    </div>
  );
}

function ComplaintHeader({ complaint }) {
  const loc = complaint.location || {};
  const currentIndex = STATUS_ORDER.indexOf(complaint.status);
  const progress =
    complaint.status === "Resolved"
      ? 100
      : Math.max(10, Math.round(((currentIndex + 1) / STATUS_ORDER.length) * 100));

  return (
    <section className="cp-ct-master-card">
      <div className="cp-ct-header-glow" />
      <div className="cp-ct-master-content">
        <div className="cp-ct-master-main">
          <div className="cp-ct-header-badges">
            <span className="cp-ct-status-pill">
              <span className="cp-ct-pulse"><span /><b /></span>
              {complaint.status?.toUpperCase()}
            </span>
            <span className="cp-ct-sla-pill">
              <Icon>timer</Icon>
              <strong>{complaint.sla_due_at ? `Due ${fmt(complaint.sla_due_at)}` : "No SLA"}</strong>
            </span>
            <span className="cp-ct-priority-pill">
              <span />
              {complaint.priority} ({complaint.priority_score}/100)
            </span>
          </div>

          <h1>{complaint.description}</h1>

          <div className="cp-ct-meta-row">
            <div>
              <Icon>schedule</Icon>
              <span>{timeAgo(complaint.created_at)} ({fmt(complaint.created_at)})</span>
            </div>
            <div>
              <Icon>near_me</Icon>
              <span>{loc.address || `${loc.lat?.toFixed?.(4)}, ${loc.lng?.toFixed?.(4)}`}</span>
            </div>
            <div>
              <Icon>verified_user</Icon>
              <span>{complaint.reporter_name || "Citizen"}</span>
            </div>
          </div>
        </div>

        <div className="cp-ct-progress-card">
          <div className="cp-ct-progress-heading">
            <span>Resolution Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="cp-ct-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="cp-ct-progress-footer">
            <span>Department</span>
            <strong>{complaint.department || "General Services"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function LifecyclePipeline({ complaint }) {
  const currentIndex = STATUS_ORDER.indexOf(complaint.status);
  return (
    <section className="cp-ct-card cp-ct-lifecycle">
      <div className="cp-ct-section-heading cp-ct-lifecycle-heading">
        <div>
          <Icon>account_tree</Icon>
          <h2>Lifecycle Pipeline</h2>
        </div>
        <span>Synchronized with Municipal Dispatch Engine v4.2</span>
      </div>

      <div className="cp-ct-stepper">
        <div className="cp-ct-stepper-track" />
        <div className="cp-ct-stepper-progress" />
        <div className="cp-ct-steps">
          {PIPELINE.map((step, index) => {
            const state =
              index < currentIndex
                ? "completed"
                : index === currentIndex
                ? "active"
                : "pending";
            return (
              <div className={`cp-ct-step cp-ct-step-${state}`} key={step.key}>
                {state === "active" ? (
                  <div className="cp-ct-active-step-icon">
                    <span />
                    <div><Icon>{step.icon}</Icon></div>
                  </div>
                ) : (
                  <div className="cp-ct-step-icon"><Icon>{step.icon}</Icon></div>
                )}
                <div className="cp-ct-step-info">
                  <div className="cp-ct-step-title">{step.title}</div>
                  <div className="cp-ct-step-detail">{step.key}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CurrentActivity({ complaint }) {
  const loc = complaint.location || {};
  return (
    <section className="cp-ct-card cp-ct-activity-card">
      <div className="cp-ct-activity-heading">
        <div className="cp-ct-activity-icon"><Icon>radar</Icon></div>
        <div>
          <span>Current Activity Pulse</span>
          <h3>What's happening now?</h3>
        </div>
      </div>

      <p className="cp-ct-activity-text">
        This complaint is currently <code>{complaint.status}</code>
        {complaint.assigned_to ? <> and assigned to <code>{complaint.assigned_to}</code></> : null}.
        {" "}Category: {complaint.category}.
      </p>

      <div className="cp-ct-dispatch-box">
        <div className="cp-ct-dispatch-info">
          <div className="cp-ct-dispatch-icon"><Icon>local_shipping</Icon></div>
          <div>
            <strong>{complaint.crew || complaint.assigned_to || "Awaiting assignment"}</strong>
            <span>
              Location: {loc.lat != null ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "Unknown"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResolutionEvidence({ complaint, canAct, onResolve, onReopen, busy }) {
  const photos = complaint.photos || [];
  return (
    <section className="cp-ct-card cp-ct-evidence-card">
      <div className="cp-ct-evidence-heading">
        <div>
          <div className="cp-ct-heading-with-icon">
            <Icon>verified</Icon>
            <h3>Resolution Status & Evidence</h3>
          </div>
          <p>Photos submitted with this report</p>
        </div>
        <span>Stage: {complaint.status}</span>
      </div>

      {photos.length ? (
        <div className="cp-ct-before-after">
          {photos.slice(0, 2).map((p, i) => (
            <div className="cp-ct-evidence-panel" key={i}>
              <div className="cp-ct-evidence-image">
                <img src={assetUrl(p)} alt={`Report attachment ${i + 1}`} />
                <span className="cp-ct-image-label cp-ct-before-label">
                  ATTACHMENT #{i + 1}
                </span>
              </div>
              <div className="cp-ct-image-footer">
                <span>Report Attachment #{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="cp-ct-activity-text">No photo evidence attached to this report.</p>
      )}

      <div className="cp-ct-confirmation">
        <div className="cp-ct-confirmation-info">
          <div className="cp-ct-confirmation-icon"><Icon>how_to_reg</Icon></div>
          <div>
            <strong>Was the issue resolved to your satisfaction?</strong>
            <span>
              {canAct
                ? "Your confirmation updates the municipal audit ledger."
                : "Sign in to confirm or reopen this ticket."}
            </span>
          </div>
        </div>

        <div className="cp-ct-confirmation-actions">
          <button className="cp-ct-close-ticket" onClick={onResolve} disabled={!canAct || busy}>
            <Icon>check_circle</Icon>
            Yes, Close Ticket
          </button>
          <button className="cp-ct-reopen" onClick={onReopen} disabled={!canAct || busy}>
            <Icon>flag</Icon>
            Reopen
          </button>
        </div>
      </div>
    </section>
  );
}

function CommunicationLog({ messages, canComment, onSubmit }) {
  const [comment, setComment] = useState("");

  const submit = async () => {
    if (!comment.trim()) return;
    const text = comment.trim();
    setComment("");
    await onSubmit(text);
  };

  return (
    <section className="cp-ct-card cp-ct-communication">
      <div className="cp-ct-communication-heading">
        <div>
          <Icon>forum</Icon>
          <h3>Communication Log</h3>
        </div>
        <span>{messages.length} messages archived</span>
      </div>

      <div className="cp-ct-comments">
        {messages.length === 0 && (
          <p className="cp-ct-activity-text">No messages yet.</p>
        )}
        {messages.map((message, index) => {
          const isOfficer = message.author_role === "officer" || message.author_role === "admin";
          const name = message.author_name || "Citizen";
          const initials = name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              className={`cp-ct-comment ${isOfficer ? "cp-ct-comment-officer" : "cp-ct-comment-citizen"}`}
              key={`${message.created_at}-${index}`}
            >
              <div className={`cp-ct-avatar ${isOfficer ? "cp-ct-avatar-officer" : "cp-ct-avatar-citizen"}`}>
                {initials}
              </div>
              <div className="cp-ct-comment-content">
                <div className="cp-ct-comment-meta">
                  <strong>{name}</strong>
                  <span>{fmt(message.created_at)}</span>
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cp-ct-comment-form">
        <label htmlFor="comment-input">
          {canComment ? "Post an update" : "Sign in to post updates"}
        </label>
        <div className="cp-ct-comment-input-row">
          <input
            id="comment-input"
            value={comment}
            disabled={!canComment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Add a comment or additional evidence..."
          />
          <button onClick={submit} disabled={!canComment}>
            <Icon>send</Icon>
            Submit
          </button>
        </div>
      </div>
    </section>
  );
}

function TicketProfile({ complaint }) {
  const loc = complaint.location || {};
  const rows = [
    { icon: "category", label: "Category", value: complaint.category },
    { icon: "tag", label: "Ticket", value: complaint.ticket_id, code: true },
    { icon: "pin_drop", label: "Location", value: loc.address || "—" },
    { icon: "apartment", label: "Department", value: complaint.department || "—" },
  ];

  return (
    <section className="cp-ct-card cp-ct-profile-card">
      <div className="cp-ct-profile-heading">
        <h3>Ticket Profile</h3>
        <span>{complaint.ticket_id}</span>
      </div>

      <div className="cp-ct-profile-rows">
        {rows.map((row) => (
          <div className="cp-ct-profile-row" key={row.label}>
            <div>
              <Icon>{row.icon}</Icon>
              <span>{row.label}</span>
            </div>
            <strong className={row.code ? "cp-ct-code-value" : ""}>{row.value}</strong>
          </div>
        ))}

        <div className="cp-ct-profile-row">
          <div>
            <Icon>badge</Icon>
            <span>Assigned Officer</span>
          </div>
          <div className="cp-ct-officer">
            <strong>{complaint.assigned_to || "Unassigned"}</strong>
          </div>
        </div>

        <div className="cp-ct-profile-row">
          <div>
            <Icon>shield</Icon>
            <span>SLA Due</span>
          </div>
          <strong className="cp-ct-sla-value">{fmt(complaint.sla_due_at) || "—"}</strong>
        </div>
      </div>
    </section>
  );
}

function LocationMap({ complaint }) {
  const loc = complaint.location || {};
  return (
    <section className="cp-ct-card cp-ct-map-card">
      <div className="cp-ct-map-heading">
        <div>
          <Icon>map</Icon>
          <h3>Location & Grid Marker</h3>
        </div>
        <span>{loc.ward || "Sector"}</span>
      </div>

      <div className="cp-ct-map">
        <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
          <path d="M-20 60 H420" stroke="currentColor" strokeLinecap="round" strokeWidth="28" />
          <path d="M120 -20 V270" stroke="currentColor" strokeLinecap="round" strokeWidth="24" />
          <path d="M280 60 Q300 160 420 180" stroke="currentColor" strokeLinecap="round" strokeWidth="20" />
          <path d="M-20 84 H420" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="3" />
          <path d="M100 -20 V270" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="3" />
        </svg>

        <div className="cp-ct-map-hotspot">
          <div className="cp-ct-map-hotspot-icon">
            <span />
            <div><Icon>light</Icon></div>
          </div>
          <span>{loc.address || "Reported location"}</span>
        </div>
      </div>

      <div className="cp-ct-map-footer">
        <span>
          {loc.lat != null ? `Lat: ${loc.lat.toFixed(5)} • Lon: ${loc.lng.toFixed(5)}` : "Coordinates unavailable"}
        </span>
        <a href="/admin/map">
          Open Full GIS Viewer
          <Icon>open_in_new</Icon>
        </a>
      </div>
    </section>
  );
}

function AuditTrail({ events }) {
  return (
    <section className="cp-ct-card cp-ct-audit-card">
      <div className="cp-ct-audit-heading">
        <div>
          <Icon>history</Icon>
          <h3>Audit Trail</h3>
        </div>
        <span><i />Immutably Logged</span>
      </div>

      <div className="cp-ct-audit-list">
        {events.length === 0 && <p className="cp-ct-activity-text">No audit events yet.</p>}
        {events.map((event, index) => (
          <div className="cp-ct-audit-event" key={`${event.created_at}-${index}`}>
            <span className={index === 0 ? "cp-ct-audit-dot cp-ct-audit-dot-active" : "cp-ct-audit-dot"} />
            <div>
              <strong>{event.action?.replace(/_/g, " ") || "event"}</strong>
              <p>{event.detail}</p>
              <time>{event.actor_name} • {fmt(event.created_at)}</time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ComplaintTracking() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    // No ticket in the URL (the /citizen/track entry) — just show the lookup.
    if (!id) {
      setComplaint(null);
      setLoading(false);
      return;
    }
    try {
      const [c, cm, au] = await Promise.all([
        complaintService.get(id),
        complaintService.comments(id).catch(() => ({ comments: [] })),
        complaintService.audit(id).catch(() => ({ events: [] })),
      ]);
      setComplaint(c.complaint);
      setComments(cm.comments || []);
      // audit newest-first for display
      setAudit((au.events || []).slice().reverse());
    } catch (err) {
      setError(err?.message || "Could not load this complaint.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(complaint?.ticket_id || id);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const resolveTarget = complaint?.ticket_id || complaint?.id || id;

  const handleResolve = async () => {
    setBusy(true);
    try {
      await complaintService.resolve(resolveTarget);
      setToast("Ticket marked as resolved.");
      await load();
    } catch (err) {
      setToast(err?.message || "Could not resolve ticket.");
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    try {
      await complaintService.reopen(resolveTarget);
      setToast("Ticket reopened.");
      await load();
    } catch (err) {
      setToast(err?.message || "Could not reopen ticket.");
    } finally {
      setBusy(false);
    }
  };

  const handleComment = async (text) => {
    try {
      await complaintService.addComment(resolveTarget, text);
      const cm = await complaintService.comments(resolveTarget);
      setComments(cm.comments || []);
    } catch (err) {
      setToast(err?.message || "Could not post comment.");
    }
  };

  if (loading) {
    return (
      <div className="cp-ct-page">
        <Navbar />
        <main className="cp-ct-main">
          <div className="cp-ct-container" style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>
            Loading complaint…
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="cp-ct-page">
        <Navbar />
        <main className="cp-ct-main">
          <div className="cp-ct-container" style={{ padding: "72px 0" }}>
            <TrackLookup
              message={
                id
                  ? error || "We couldn't find that complaint."
                  : "Enter your tracking ID to see the latest status of your report."
              }
              currentId={id}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="cp-ct-page">
      <Navbar />

      <main className="cp-ct-main">
        <div className="cp-ct-container">
          <Breadcrumb
            ticketId={complaint.ticket_id}
            title={complaint.category}
            onCopy={copyId}
            copied={copied}
          />

          {toast && (
            <div className="cp-ct-toast">
              <Icon>check_circle</Icon>
              {toast}
              <button onClick={() => setToast("")} aria-label="Close">
                <Icon>close</Icon>
              </button>
            </div>
          )}

          <ComplaintHeader complaint={complaint} />
          <LifecyclePipeline complaint={complaint} />

          <div className="cp-ct-content-grid">
            <div className="cp-ct-left-column">
              <CurrentActivity complaint={complaint} />
              <ResolutionEvidence
                complaint={complaint}
                canAct={isAuthenticated}
                busy={busy}
                onResolve={handleResolve}
                onReopen={handleReopen}
              />
              <CommunicationLog
                messages={comments}
                canComment={isAuthenticated}
                onSubmit={handleComment}
              />
            </div>

            <aside className="cp-ct-right-column">
              <TicketProfile complaint={complaint} />
              <LocationMap complaint={complaint} />
              <AuditTrail events={audit} />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
