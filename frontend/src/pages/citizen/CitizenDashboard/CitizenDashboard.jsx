import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CitizenLayout from "../../../components/CitizenLayout/CitizenLayout";
import { complaintService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./CitizenDashboard.css";

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

const STATUS_CLASS = {
  New: "cp-cz-st-new",
  Assigned: "cp-cz-st-assigned",
  "In Progress": "cp-cz-st-inprogress",
  Resolved: "cp-cz-st-resolved",
  Reopened: "cp-cz-st-reopened",
};

function statusClass(s) {
  return STATUS_CLASS[s] || "cp-cz-st-new";
}

function fmtDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ complaints: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    complaintService
      .mine()
      .then((res) => active && setData(res))
      .catch(() => active && setData({ complaints: [], summary: null }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const summary = data.summary || { total: 0, open: 0, resolved: 0 };
  const recent = data.complaints.slice(0, 4);
  const firstName = (user?.name || "there").split(/\s+/)[0];

  return (
    <CitizenLayout
      active="home"
      title={`Welcome back, ${firstName}`}
      subtitle="Here's an overview of your civic activity."
      actions={
        <Link to="/citizen/report" className="cp-cz-btn cp-cz-btn-primary">
          <Icon>add_circle</Icon> Report an Issue
        </Link>
      }
    >
      {/* Summary stats */}
      <div className="cp-cd-stats">
        <div className="cp-cd-stat">
          <span className="cp-cd-stat-icon cp-blue"><Icon>receipt_long</Icon></span>
          <div>
            <strong>{loading ? "—" : summary.total}</strong>
            <small>Total reports</small>
          </div>
        </div>
        <div className="cp-cd-stat">
          <span className="cp-cd-stat-icon cp-amber"><Icon>pending_actions</Icon></span>
          <div>
            <strong>{loading ? "—" : summary.open}</strong>
            <small>In progress</small>
          </div>
        </div>
        <div className="cp-cd-stat">
          <span className="cp-cd-stat-icon cp-green"><Icon>task_alt</Icon></span>
          <div>
            <strong>{loading ? "—" : summary.resolved}</strong>
            <small>Resolved</small>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <section className="cp-cd-section">
        <h2>Quick actions</h2>
        <div className="cp-cd-actions">
          <Link to="/citizen/report" className="cp-cd-action">
            <span className="cp-cd-action-icon cp-blue"><Icon>add_a_photo</Icon></span>
            <strong>Report a new issue</strong>
            <small>Potholes, streetlights, water, and more</small>
          </Link>
          <Link to="/citizen/complaints" className="cp-cd-action">
            <span className="cp-cd-action-icon cp-green"><Icon>list_alt</Icon></span>
            <strong>View my complaints</strong>
            <small>Track status and updates</small>
          </Link>
          <Link to="/citizen/track" className="cp-cd-action">
            <span className="cp-cd-action-icon cp-amber"><Icon>travel_explore</Icon></span>
            <strong>Track by ticket ID</strong>
            <small>Look up any report you have</small>
          </Link>
        </div>
      </section>

      {/* Recent complaints */}
      <section className="cp-cd-section">
        <div className="cp-cd-section-head">
          <h2>Recent reports</h2>
          {data.complaints.length > 0 && (
            <Link to="/citizen/complaints" className="cp-cd-viewall">
              View all <Icon>arrow_forward</Icon>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="cp-cz-state"><Icon>hourglass_top</Icon>Loading your reports…</div>
        ) : recent.length === 0 ? (
          <div className="cp-cz-state">
            <Icon>inbox</Icon>
            <p>You haven't reported anything yet.</p>
            <Link to="/citizen/report" className="cp-cz-btn cp-cz-btn-primary">
              <Icon>add_circle</Icon> Report your first issue
            </Link>
          </div>
        ) : (
          <div className="cp-cd-list">
            {recent.map((c) => (
              <button
                key={c.id}
                className="cp-cd-item"
                onClick={() => navigate(`/citizen/complaints/${c.ticket_id || c.id}`)}
              >
                <div className="cp-cd-item-main">
                  <span className="cp-cd-ticket">{c.ticket_id}</span>
                  <strong>{c.category}</strong>
                  <small>{c.location?.address || "Location on file"} · {fmtDate(c.created_at)}</small>
                </div>
                <span className={`cp-cz-pill ${statusClass(c.status)}`}>{c.status}</span>
                <Icon className="cp-cd-chevron">chevron_right</Icon>
              </button>
            ))}
          </div>
        )}
      </section>
    </CitizenLayout>
  );
}
