import { useState } from "react";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import "./ComplaintTracking.css";

const complaint = {
  id: "CP-2026-004821",
  title: "Streetlight near Gate 3 is non-functional",
  status: "IN PROGRESS",
  sla: "08h 42m remaining",
  slaTarget: "SLA 96h target",
  priority: "HIGH PRIORITY",
  priorityScore: 82,
  reported: "7 days ago (Oct 18, 2026 • 20:14)",
  location: "Gate 3 • North Campus Perimeter Highway",
  resident: "Resident Verified #R-8022",
  progress: 78,
};

const timeline = [
  {
    title: "Reported",
    date: "Oct 18, 20:14",
    detail: "Citizen Ingest",
    icon: "check",
    state: "completed",
  },
  {
    title: "AI Triage",
    date: "Oct 18, 20:15",
    detail: "94% Confidence",
    icon: "neurology",
    state: "completed",
  },
  {
    title: "Assigned",
    date: "Oct 19, 09:30",
    detail: "Insp. Vance",
    icon: "assignment_ind",
    state: "completed",
  },
  {
    title: "In Progress",
    date: "Oct 21, 14:10",
    detail: "Crew Onsite",
    icon: "engineering",
    state: "active",
  },
  {
    title: "Resolved",
    date: "Est. Oct 22, 10:00",
    detail: "Pending sign-off",
    icon: "task_alt",
    state: "pending",
  },
];

const comments = [
  {
    initials: "DV",
    name: "Senior Insp. David Vance • Electrical Maintenance Div. 4",
    date: "Oct 21, 14:15",
    text: "Arrived on site with utility unit 3B. Initial multimeter readings show ballast failure at Pole #GL-408. Replacing internal surge capacitor and rewiring circuit feeder now.",
    type: "officer",
  },
  {
    initials: "ME",
    name: "You (Citizen Reporter)",
    date: "Oct 20, 18:22",
    text: "Thank you for the update. Please note the sidewalk near the gate gets heavy student foot traffic starting 18:00 every evening. Appreciate the swift dispatch!",
    type: "citizen",
  },
];

const auditEvents = [
  {
    title: "Field worker started onsite diagnostic work",
    description:
      "Operative David Vance arrived on site. Multimeter test initiated.",
    date: "Oct 21, 2026 • 14:10",
    active: true,
  },
  {
    title: "Officer accepted assignment & queued equipment",
    description: "Boom lift #B-14 allocated from regional depot.",
    date: "Oct 20, 2026 • 16:45",
  },
  {
    title: "Assigned to Electrical Maintenance Division 4",
    description:
      "Triage supervisor routed to local campus zone engineer.",
    date: "Oct 19, 2026 • 09:30",
  },
  {
    title: "AI automated triage completed",
    description:
      "Classified as High Urgency (nighttime pedestrian hazard). SLA locked to 96h.",
    date: "Oct 18, 2026 • 20:15",
  },
  {
    title: "Complaint submitted via Civic Web Portal",
    description:
      "Ticket CP-2026-004821 generated with citizen photo metadata.",
    date: "Oct 18, 2026 • 20:14",
  },
];

function Icon({ children, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {children}
    </span>
  );
}

function Breadcrumb({ onCopy, copied }) {
  return (
    <div className="cp-ct-topbar">
      <div className="cp-ct-breadcrumb">
        <a href="#" className="cp-ct-back-link">
          <Icon>arrow_back</Icon>
          Complaints
        </a>

        <span className="cp-ct-slash">/</span>

        <span className="cp-ct-ticket-code">CP-2026-004821</span>

        <span className="cp-ct-slash">/</span>

        <span className="cp-ct-breadcrumb-title">
          Gate 3 Luminaire Fault
        </span>
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

function ComplaintHeader() {
  return (
    <section className="cp-ct-master-card">
      <div className="cp-ct-header-glow" />

      <div className="cp-ct-master-content">
        <div className="cp-ct-master-main">
          <div className="cp-ct-header-badges">
            <span className="cp-ct-status-pill">
              <span className="cp-ct-pulse">
                <span />
                <b />
              </span>
              IN PROGRESS
            </span>

            <span className="cp-ct-sla-pill">
              <Icon>timer</Icon>
              <strong>08h 42m remaining</strong>
              <span>(SLA 96h target)</span>
            </span>

            <span className="cp-ct-priority-pill">
              <span />
              HIGH PRIORITY (82/100)
            </span>
          </div>

          <h1>{complaint.title}</h1>

          <div className="cp-ct-meta-row">
            <div>
              <Icon>schedule</Icon>
              <span>{complaint.reported}</span>
            </div>

            <div>
              <Icon>near_me</Icon>
              <span>{complaint.location}</span>
            </div>

            <div>
              <Icon>verified_user</Icon>
              <span>{complaint.resident}</span>
            </div>
          </div>
        </div>

        <div className="cp-ct-progress-card">
          <div className="cp-ct-progress-heading">
            <span>Resolution Progress</span>
            <strong>{complaint.progress}%</strong>
          </div>

          <div className="cp-ct-progress-track">
            <div style={{ width: `${complaint.progress}%` }} />
          </div>

          <div className="cp-ct-progress-footer">
            <span>Est. Completion</span>
            <strong>Tomorrow, 10:00</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function LifecyclePipeline() {
  return (
    <section className="cp-ct-card cp-ct-lifecycle">
      <div className="cp-ct-section-heading cp-ct-lifecycle-heading">
        <div>
          <Icon>account_tree</Icon>
          <h2>Lifecycle Pipeline</h2>
        </div>

        <span>
          Synchronized with Municipal Dispatch Engine v4.2
        </span>
      </div>

      <div className="cp-ct-stepper">
        <div className="cp-ct-stepper-track" />
        <div className="cp-ct-stepper-progress" />

        <div className="cp-ct-steps">
          {timeline.map((step) => (
            <div
              className={`cp-ct-step cp-ct-step-${step.state}`}
              key={step.title}
            >
              {step.state === "active" ? (
                <div className="cp-ct-active-step-icon">
                  <span />
                  <div>
                    <Icon>{step.icon}</Icon>
                  </div>
                </div>
              ) : (
                <div className="cp-ct-step-icon">
                  <Icon>{step.icon}</Icon>
                </div>
              )}

              <div className="cp-ct-step-info">
                <div className="cp-ct-step-title">{step.title}</div>
                <div className="cp-ct-step-date">{step.date}</div>

                {step.state === "active" ? (
                  <span className="cp-ct-crew-badge">{step.detail}</span>
                ) : (
                  <div className="cp-ct-step-detail">
                    {step.icon === "check" && (
                      <Icon>bolt</Icon>
                    )}
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentActivity() {
  return (
    <section className="cp-ct-card cp-ct-activity-card">
      <div className="cp-ct-activity-heading">
        <div className="cp-ct-activity-icon">
          <Icon>radar</Icon>
        </div>

        <div>
          <span>Current Activity Pulse</span>
          <h3>What's happening now?</h3>
        </div>
      </div>

      <p className="cp-ct-activity-text">
        Electrical maintenance team has been assigned and a field technician
        is actively testing the luminaire driver and checking underground
        wiring junction boxes adjacent to{" "}
        <code>Pole #GL-408</code>.
      </p>

      <div className="cp-ct-dispatch-box">
        <div className="cp-ct-dispatch-info">
          <div className="cp-ct-dispatch-icon">
            <Icon>local_shipping</Icon>
          </div>

          <div>
            <strong>Crew 3B dispatched with boom truck #B-14</strong>
            <span>
              Live coordinate broadcast: 42.3601° N, 71.0589° W
            </span>
          </div>
        </div>

        <div className="cp-ct-extension">
          <Icon>call</Icon>
          Ext. 4082
        </div>
      </div>
    </section>
  );
}

function ResolutionEvidence({ onResolve, onReopen }) {
  return (
    <section className="cp-ct-card cp-ct-evidence-card">
      <div className="cp-ct-evidence-heading">
        <div>
          <div className="cp-ct-heading-with-icon">
            <Icon>verified</Icon>
            <h3>Resolution Status & Evidence</h3>
          </div>

          <p>
            Automated visual proof captured by field operative Vance
          </p>
        </div>

        <span>Stage: Inspection Proof</span>
      </div>

      <div className="cp-ct-before-after">
        <div className="cp-ct-evidence-panel">
          <div className="cp-ct-evidence-image">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD01h38Pq7SkSEczhGbZ7jlHo0faWs-zjUh4MOsVafWvLGfC6UBq7UXQEuj7-LXHOcTqY6REKL4IE48UHI9mtnfNE6wrNEBFwt1K7kMtkUTEMOUT-RhqP7TzLwNqXisTIEscfUknj0kWfMsPXenzJXmdvd01lflP9QG7y3O302FaWjDZoUUojRc4qusafU3KMr688YTb7k6kHOPdsFvuqfxFbWVTJ4M1fCZB_LiPhtU0DRqeUuKZ3TGrw"
              alt="Dark unlit municipal campus pathway"
            />

            <span className="cp-ct-image-label cp-ct-before-label">
              BEFORE: Oct 18 • 20:14
            </span>
          </div>

          <div className="cp-ct-image-footer">
            <span>Report Attachment #1</span>
            <strong>
              <Icon>cancel</Icon>
              No Illumination
            </strong>
          </div>
        </div>

        <div className="cp-ct-evidence-panel">
          <div className="cp-ct-evidence-image">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYIlDruqs231awQcgnrxr74iZ3gcxy_nLu-2ik265ZBGddWcA8g5RZYN6ABXjFKd9CHGt-j1u4pBBRLBuE57cvElcAZLRD6Sod4Ba0moGH5mrw-CzFbzhTmAYx6Lb_cIbxkyc-qn2C7YYnl4yYUGFeaenZkkp0llZT5QRwXBrE1cqLNLHbvCjWqNutoZlZEmQwKY9sJ_07Iv840B-oc2AyhqFwDuJohnFviKE3FWV2_48BKJ3xkv0Ktw"
              alt="High-output LED streetlight"
            />

            <span className="cp-ct-image-label cp-ct-after-label">
              <Icon>check_circle</Icon>
              PROPOSED FIX: Oct 21 • 15:30
            </span>
          </div>

          <div className="cp-ct-image-footer">
            <span>Field Crew Benchmark</span>
            <strong className="cp-ct-success-text">
              <Icon>check</Icon>
              120W Driver Operational
            </strong>
          </div>
        </div>
      </div>

      <div className="cp-ct-confirmation">
        <div className="cp-ct-confirmation-info">
          <div className="cp-ct-confirmation-icon">
            <Icon>how_to_reg</Icon>
          </div>

          <div>
            <strong>Was the issue resolved to your satisfaction?</strong>
            <span>
              Your confirmation directly closes this ticket and updates our
              municipal audit ledger.
            </span>
          </div>
        </div>

        <div className="cp-ct-confirmation-actions">
          <button
            className="cp-ct-close-ticket"
            onClick={onResolve}
          >
            <Icon>check_circle</Icon>
            Yes, Close Ticket
          </button>

          <button
            className="cp-ct-reopen"
            onClick={onReopen}
          >
            <Icon>flag</Icon>
            Reopen
          </button>
        </div>
      </div>
    </section>
  );
}

function CommunicationLog() {
  const [comment, setComment] = useState("");
  const [messages, setMessages] = useState(comments);

  const submitComment = () => {
    if (!comment.trim()) return;

    setMessages((current) => [
      ...current,
      {
        initials: "ME",
        name: "You (Citizen Reporter)",
        date: "Just now",
        text: comment.trim(),
        type: "citizen",
      },
    ]);

    setComment("");
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
        {messages.map((message, index) => (
          <div
            className={`cp-ct-comment ${
              message.type === "officer"
                ? "cp-ct-comment-officer"
                : "cp-ct-comment-citizen"
            }`}
            key={`${message.date}-${index}`}
          >
            <div
              className={`cp-ct-avatar ${
                message.type === "officer"
                  ? "cp-ct-avatar-officer"
                  : "cp-ct-avatar-citizen"
              }`}
            >
              {message.initials}
            </div>

            <div className="cp-ct-comment-content">
              <div className="cp-ct-comment-meta">
                <strong>{message.name}</strong>
                <span>{message.date}</span>
              </div>

              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="cp-ct-comment-form">
        <label htmlFor="comment-input">
          Post updates or upload supplemental photo
        </label>

        <div className="cp-ct-comment-input-row">
          <input
            id="comment-input"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitComment();
            }}
            placeholder="Add a comment or additional evidence..."
          />

          <button onClick={submitComment}>
            <Icon>send</Icon>
            Submit
          </button>
        </div>
      </div>
    </section>
  );
}

function TicketProfile() {
  const rows = [
    {
      icon: "category",
      label: "Category",
      value: "Streetlight & Municipal Power",
    },
    {
      icon: "tag",
      label: "Asset Tag",
      value: "POLE-GL-408",
      code: true,
    },
    {
      icon: "pin_drop",
      label: "Location",
      value: "Gate 3, North Perimeter",
    },
    {
      icon: "apartment",
      label: "Department",
      value: "Electrical Maintenance Div. 4",
    },
  ];

  return (
    <section className="cp-ct-card cp-ct-profile-card">
      <div className="cp-ct-profile-heading">
        <h3>Ticket Profile</h3>
        <span>CP-2026-004821</span>
      </div>

      <div className="cp-ct-profile-rows">
        {rows.map((row) => (
          <div className="cp-ct-profile-row" key={row.label}>
            <div>
              <Icon>{row.icon}</Icon>
              <span>{row.label}</span>
            </div>

            <strong className={row.code ? "cp-ct-code-value" : ""}>
              {row.value}
            </strong>
          </div>
        ))}

        <div className="cp-ct-profile-row">
          <div>
            <Icon>badge</Icon>
            <span>Assigned Officer</span>
          </div>

          <div className="cp-ct-officer">
            <strong>Insp. David Vance</strong>
            <span>Badge #7412</span>
          </div>
        </div>

        <div className="cp-ct-profile-row">
          <div>
            <Icon>shield</Icon>
            <span>Warranty / SLA</span>
          </div>

          <strong className="cp-ct-sla-value">
            Standard 96h Civic Guarantee
          </strong>
        </div>
      </div>
    </section>
  );
}

function LocationMap() {
  return (
    <section className="cp-ct-card cp-ct-map-card">
      <div className="cp-ct-map-heading">
        <div>
          <Icon>map</Icon>
          <h3>Location & Grid Marker</h3>
        </div>

        <span>Sector N-4</span>
      </div>

      <div className="cp-ct-map">
        <svg
          viewBox="0 0 400 250"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-20 60 H420"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="28"
          />

          <path
            d="M120 -20 V270"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="24"
          />

          <path
            d="M280 60 Q300 160 420 180"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="20"
          />

          <path
            d="M-20 84 H420"
            stroke="#CBD5E1"
            strokeDasharray="4 4"
            strokeWidth="3"
          />

          <path
            d="M100 -20 V270"
            stroke="#CBD5E1"
            strokeDasharray="4 4"
            strokeWidth="3"
          />

          <rect
            fill="#E2E7FF"
            height="90"
            opacity="0.6"
            rx="6"
            width="120"
            x="140"
            y="85"
          />

          <text
            fill="#444653"
            fontFamily="Geist"
            fontSize="10"
            fontWeight="600"
            x="150"
            y="135"
          >
            RESEARCH BLDG 4
          </text>

          <rect
            fill="#DAE2FD"
            height="120"
            opacity="0.4"
            rx="6"
            width="80"
            x="20"
            y="85"
          />

          <text
            fill="#444653"
            fontFamily="Geist"
            fontSize="9"
            x="30"
            y="145"
          >
            SECURITY LOT
          </text>

          <path
            d="M110 50 L110 70 M115 50 L115 70 M120 50 L120 70 M125 50 L125 70 M130 50 L130 70"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />

          <path
            d="M-10 40 Q120 45 280 40 T410 40"
            opacity="0.5"
            stroke="#3755C3"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
        </svg>

        <div className="cp-ct-map-hotspot">
          <div className="cp-ct-map-hotspot-icon">
            <span />
            <div>
              <Icon>light</Icon>
            </div>
          </div>

          <span>Pole #GL-408 (Outage)</span>
        </div>

        <div className="cp-ct-map-feed">
          <div>
            <span />
            Feed: Substation 14B
          </div>
          <small>Grid Junction N-40</small>
        </div>
      </div>

      <div className="cp-ct-map-footer">
        <span>Lat: 42.36014 • Lon: -71.05891</span>

        <a href="#">
          Open Full GIS Viewer
          <Icon>open_in_new</Icon>
        </a>
      </div>
    </section>
  );
}

function AuditTrail() {
  return (
    <section className="cp-ct-card cp-ct-audit-card">
      <div className="cp-ct-audit-heading">
        <div>
          <Icon>history</Icon>
          <h3>Audit Trail</h3>
        </div>

        <span>
          <i />
          Immutably Logged
        </span>
      </div>

      <div className="cp-ct-audit-list">
        {auditEvents.map((event) => (
          <div className="cp-ct-audit-event" key={event.title}>
            <span
              className={
                event.active
                  ? "cp-ct-audit-dot cp-ct-audit-dot-active"
                  : "cp-ct-audit-dot"
              }
            />

            <div>
              <strong>{event.title}</strong>
              <p>{event.description}</p>
              <time>{event.date}</time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ComplaintTracking() {
  const [copied, setCopied] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");

  const copyComplaintId = async () => {
    try {
      await navigator.clipboard.writeText(complaint.id);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleResolve = () => {
    setResolutionMessage(
      "Thank you! Ticket marked as Citizen-Verified Resolved."
    );
  };

  const handleReopen = () => {
    setResolutionMessage("Ticket flagged for further review.");
  };

  return (
    <div className="cp-ct-page">
      <Navbar />

      <main className="cp-ct-main">
        <div className="cp-ct-container">
          <Breadcrumb
            onCopy={copyComplaintId}
            copied={copied}
          />

          {resolutionMessage && (
            <div className="cp-ct-toast">
              <Icon>check_circle</Icon>
              {resolutionMessage}
              <button
                onClick={() => setResolutionMessage("")}
                aria-label="Close"
              >
                <Icon>close</Icon>
              </button>
            </div>
          )}

          <ComplaintHeader />

          <LifecyclePipeline />

          <div className="cp-ct-content-grid">
            <div className="cp-ct-left-column">
              <CurrentActivity />

              <ResolutionEvidence
                onResolve={handleResolve}
                onReopen={handleReopen}
              />

              <CommunicationLog />
            </div>

            <aside className="cp-ct-right-column">
              <TicketProfile />
              <LocationMap />
              <AuditTrail />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}