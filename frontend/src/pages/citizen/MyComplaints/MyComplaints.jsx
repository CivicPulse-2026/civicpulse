import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CitizenLayout from "../../../components/CitizenLayout/CitizenLayout";
import { complaintService } from "../../../lib/services";
import "./MyComplaints.css";

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

const PRIORITY_CLASS = {
  CRITICAL: "cp-cz-pr-critical",
  HIGH: "cp-cz-pr-high",
  MEDIUM: "cp-cz-pr-medium",
  LOW: "cp-cz-pr-low",
};

const FILTERS = ["All", "Open", "Resolved"];

function fmtDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let active = true;
    complaintService
      .mine()
      .then((res) => active && setComplaints(res.complaints || []))
      .catch(() => active && setComplaints([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "Open") return complaints.filter((c) => c.status !== "Resolved");
    if (filter === "Resolved") return complaints.filter((c) => c.status === "Resolved");
    return complaints;
  }, [complaints, filter]);

  return (
    <CitizenLayout
      active="complaints"
      title="My Complaints"
      subtitle="Every issue you've reported, with live status."
      actions={
        <Link to="/citizen/report" className="cp-cz-btn cp-cz-btn-primary">
          <Icon>add_circle</Icon> Report an Issue
        </Link>
      }
    >
      <div className="cp-mc-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`cp-mc-filter ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cp-cz-state"><Icon>hourglass_top</Icon>Loading your complaints…</div>
      ) : filtered.length === 0 ? (
        <div className="cp-cz-state">
          <Icon>inbox</Icon>
          <p>
            {complaints.length === 0
              ? "You haven't reported anything yet."
              : `No ${filter.toLowerCase()} complaints.`}
          </p>
          {complaints.length === 0 && (
            <Link to="/citizen/report" className="cp-cz-btn cp-cz-btn-primary">
              <Icon>add_circle</Icon> Report your first issue
            </Link>
          )}
        </div>
      ) : (
        <div className="cp-mc-grid">
          {filtered.map((c) => (
            <button
              key={c.id}
              className="cp-mc-card"
              onClick={() => navigate(`/citizen/complaints/${c.ticket_id || c.id}`)}
            >
              <div className="cp-mc-card-top">
                <span className="cp-mc-ticket">{c.ticket_id}</span>
                <span className={`cp-cz-pill ${PRIORITY_CLASS[c.priority] || "cp-cz-pr-low"}`}>
                  {c.priority}
                </span>
              </div>
              <h3>{c.category}</h3>
              <p className="cp-mc-desc">{c.description}</p>
              <div className="cp-mc-card-foot">
                <span className={`cp-cz-pill ${STATUS_CLASS[c.status] || "cp-cz-st-new"}`}>
                  {c.status}
                </span>
                <small>
                  <Icon>place</Icon>
                  {c.location?.address || "Location on file"}
                </small>
                <small className="cp-mc-date">{fmtDate(c.created_at)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </CitizenLayout>
  );
}
