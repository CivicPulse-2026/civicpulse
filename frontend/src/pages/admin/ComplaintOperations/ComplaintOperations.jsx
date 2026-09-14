import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import "./ComplaintOperations.css";

const photos = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkBqQQp-6bkW8QdOUgKboBmEwNUzjwFTSiJYlLHSEtY3WDgCvmKvbghnGpiJko287pjjwAzEhjHOvQnuVBWaXslIMyXZKnF9yxyT4KujK-F7qNqFKPRBsH6fRStcsSLwQmXv8TFeO6aq3xoj28sIVUGRUl44BnLWHJnWkWLI9fIPqGt1b2W_L_ULS2hjRS7rN0oi-79J_KZtEaEs9QQU2F_i-Bv6HvzltGHRQxgQ0K1pOpcJ5Aeb9c6Q",
    title: "Initial Citizen Capture",
    meta: "ISO 3200 · 1/15s · 20:12 EST",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDz2bMRDKX2DcmUBozr_Gv8qLSm9DaTw3RfqdKSbTx7GUEFRFJNeH8MMZbZ7P-4hBJanrXuC8hMo6I5xlpKbwLva3rqHAetC-IS-EATYUHt4MAVPgrf4nVFlyTr7H0poKn4Aj9ECO3fHMqhbHjKr4r7nXHvG7XTQUDlsdVEDQ9CjFJiNQns0fv2w4dH1t25LDIlzxCTzifaVGjQUNEcW_MRlmVYMf6pIERT8mWeR6gt4OR3NQWnkWj_w",
    title: "Tech Field Upload",
    meta: "Vance T. · Team 04 · 14:19",
  },
];

const auditEvents = [
  ["14:20 Today", "FIELD_ON", "Field worker Vance started onsite diagnostic work.", "Telemetry: Multimeter test initiated", "secondary"],
  ["09:50 Today", "DISPATCH", "Assigned to Electrical Dept (Rahul Sharma).", "", "primary"],
  ["09:44 Today", "SLA_ENG", "72h municipal compliance SLA timer started.", "", "primary-container"],
  ["09:43 Today", "PRIO_CALC", "Score 84/100 compiled (High Urgency Flag).", "", "error"],
  ["09:42 Today", "AI_PARSE", "Classification: Streetlight (94% confidence).", "", "tint"],
  ["09:41 Today", "INGEST", "Submitted via Civic Web Portal (ID CP-2026-004821).", "", "outline"],
];

const clusterItems = [
  ["CP-004830", "Dark road corner", "Oct 18"],
  ["CP-004835", "Gate 3 lamp dead", "Oct 19"],
  ["CP-004841", "Broken luminaire", "Oct 19"],
];

export default function ComplaintOperations() {
  const { id } = useParams();
  const ticketId = id || "CP-2026-004821";

  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("IN PROGRESS");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("internal");
  const [toast, setToast] = useState("");
  const [checks, setChecks] = useState([true, false, false, true]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__civicPulseToast);
    window.__civicPulseToast = window.setTimeout(() => setToast(""), 2200);
  };

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketId);
    } catch {
      // Clipboard may be unavailable in insecure/local contexts.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const postNote = () => {
    if (!note.trim()) {
      showToast("Write a note before posting.");
      return;
    }
    setNote("");
    showToast(tab === "internal" ? "Internal operational note posted." : "Citizen update posted.");
  };

  const updateStatus = () => {
    showToast(`Lifecycle updated to ${status}. Transition logged.`);
  };

  const auditJson = useMemo(
    () =>
      JSON.stringify(
        {
          ticket_id: ticketId,
          status,
          priority_score: 84,
          category: "Streetlight & Luminaire",
          generated_at: new Date().toISOString(),
          events: auditEvents.map(([time, code, message]) => ({ time, code, message })),
        },
        null,
        2
      ),
    [ticketId, status]
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

  return (
    <div className="cp-ops-page">
      <AdminSidebar
        activeKey="complaints"
        onLogout={() => showToast("Sign out action selected.")}
      />

      <div className="cp-ops-shell">
        <header className="cp-ops-header">
          <div className="cp-ops-console">
            <Icon name="tune" />
            <span>Municipal Console</span>
            <em>/</em>
            <strong>Ward 4 Central Operations</strong>
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
                <strong>Rahul Sharma</strong>
                <small>Senior Dispatcher</small>
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
                  DISPATCH_LINK: ACTIVE (LATENCY 18ms)
                  <i>|</i>
                  SECTOR: W-04_N
                </div>
              </div>

              <div className="cp-ops-title-row">
                <div className="cp-ops-title-area">
                  <div className="cp-ops-title-line">
                    <h1>Streetlight near Gate 3 is non-functional</h1>
                    <div className="cp-ops-ticket">
                      <code>{ticketId}</code>
                      <button onClick={copyTicket} title="Copy Ticket Reference">
                        <Icon name={copied ? "check" : "content_copy"} />
                      </button>
                    </div>
                  </div>
                  <div className="cp-ops-badges">
                    <span className="cp-ops-status"><i /> {status}</span>
                    <span className="cp-ops-priority"><Icon name="bolt" /> HIGH PRIORITY · 84/100</span>
                    <span className="cp-ops-category"><Icon name="lightbulb" /> Streetlight & Municipal Power</span>
                    <span className="cp-ops-source"><Icon name="sensors" /> Verified Citizen Geo-Ingest</span>
                  </div>
                </div>

                <div className="cp-ops-actions">
                  <button onClick={() => showToast("Printable work order queued.")}><Icon name="print" /><span>Print Work Order</span></button>
                  <button onClick={() => showToast("Citizen notification staged.")}><Icon name="notifications_active" /><span>Notify Citizen</span></button>
                  <button className="danger-action" onClick={() => showToast("Escalation flag added.")}><Icon name="emergency" /><span>Escalate</span></button>
                  <button className="primary-action" onClick={() => showToast("Changes saved.")}><Icon name="save" /><span>Save Changes</span></button>
                </div>
              </div>
            </div>
          </section>

          <div className="cp-ops-content">
            <div className="cp-ops-grid">
              <div className="cp-ops-col">
                <Card icon="record_voice_over" title="Citizen Ingest" badge="INGEST_ID #R-8022">
                  <div className="cp-ops-quote">
                    <Icon name="format_quote" />
                    <p>"There has been no street light near Gate 3 for almost a week and the road gets extremely dark. High school students and evening bus commuters walk here past 19:30. Someone could easily slip or get mugged."</p>
                  </div>
                  <div className="cp-ops-meta-grid">
                    <Meta label="Reporter" value="Anonymous Resident" sub="Verified via Geo-Engine" verified />
                    <Meta label="Logged Timestamp" value="Oct 18, 2026 · 20:14" sub="Web Portal / Client v2.4" />
                  </div>
                  <div className="cp-ops-evidence">
                    <div className="cp-ops-section-label-row">
                      <span>Field Photographic Evidence</span>
                      <code>2 Attachments (EXIF verified)</code>
                    </div>
                    <div className="cp-ops-photo-grid">
                      {photos.map((photo) => (
                        <div className="cp-ops-photo" key={photo.title}>
                          <img src={photo.src} alt={photo.title} />
                          <div className="cp-ops-photo-overlay">
                            <strong>{photo.title}</strong>
                            <code>{photo.meta}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card icon="psychology" iconClass="blue" title="AI Classification Engine" badge="Rule + LLM Hybrid" badgeClass="dark">
                  <div className="cp-ops-ai-grid">
                    <Meta label="Inferred Category" value="Streetlight & Luminaire" sub="(94% conf)" verified />
                    <Meta label="Detected Landmark" value="Gate 3, North Corridor" />
                    <Meta label="Duration Extracted" value="~7 days chronic outage" danger />
                    <Meta label="Hazard Rating" value="Elevated Pedestrian" dangerDot />
                  </div>
                  <div className="cp-ops-tags">
                    <code>NLP: "almost a week" → 168hrs</code>
                    <code>Entity: Gate 3 → POI #N-408</code>
                    <code>Safety Trigger: Evening Pedestrians</code>
                  </div>
                </Card>

                <Card icon="layers" iconClass="green" title="GIS Infrastructure Topology" badge="LAYER: MUNI_LIGHTING_V3" badgeClass="plain">
                  <div className="cp-ops-map">
                    <div className="cp-ops-map-bg" />
                    <div className="cp-ops-map-overlay">
                      <code>GPS: 42.36014° N, -71.05891° W</code>
                      <span><i /> POLE #GL-408 OUTAGE</span>
                    </div>
                    <div className="cp-ops-map-hud">
                      <div>
                        <b>● GL-408</b>
                        <em>←</em>
                        <strong>JB-12 (Junction Box)</strong>
                        <em>←</em>
                        <span>Substation 14B</span>
                      </div>
                      <button onClick={() => showToast("Full GIS view requested.")}>Full GIS</button>
                    </div>
                  </div>
                  <div className="cp-ops-asset-grid">
                    <Asset label="Pole Asset" value="GL-408-A" />
                    <Asset label="Circuit" value="C-14-NORTH" />
                    <Asset label="Luminaire Type" value="LED 120W Cobra" />
                  </div>
                </Card>

                <Card icon="forum" title="Notes & Communication">
                  <div className="cp-ops-tabbar">
                    <button className={tab === "internal" ? "active" : ""} onClick={() => setTab("internal")}>Internal Ops</button>
                    <button className={tab === "public" ? "active" : ""} onClick={() => setTab("public")}>Citizen (Public)</button>
                  </div>
                  <div className="cp-ops-thread">
                    <Thread author={tab === "internal" ? "Rahul Sharma (Lead Dispatch)" : "CivicPulse Citizen Channel"} time="14:02 Today">
                      {tab === "internal"
                        ? "Team 04 was rerouted from Sector 2 after completing line repair. Driver assembly replacement kit staged in truck B-14."
                        : "Your complaint remains actively assigned to the Electrical Maintenance Division. A field unit is onsite."}
                    </Thread>
                    <Thread author="Automated SLA Daemon" time="09:44 Today">
                      Ticket categorized under Level-2 Priority. 72-hour municipal ordinance response clock engaged.
                    </Thread>
                  </div>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add operational note or dispatch instruction for Team 04..." rows={2} />
                  <div className="cp-ops-note-footer">
                    <div>
                      <button title="Attach file"><Icon name="attach_file" /></button>
                      <button title="Mention officer"><Icon name="alternate_email" /></button>
                    </div>
                    <button onClick={postNote}>Post Note</button>
                  </div>
                </Card>
              </div>

              <div className="cp-ops-col">
                <Card icon="speed" title="Priority Engine" badge="ALGO_v4.2" badgeClass="danger">
                  <div className="cp-ops-score">
                    <div>
                      <span>Dynamic Score</span>
                      <strong>84<small>/100</small></strong>
                      <b>HIGH ESCALATION</b>
                    </div>
                    <div className="cp-ops-gauge">
                      <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" />
                        <circle className="progress" cx="18" cy="18" r="15.915" />
                      </svg>
                      <Icon name="priority_high" />
                    </div>
                  </div>
                  <span className="cp-ops-section-label">Calculation Breakdown</span>
                  <div className="cp-ops-breakdown">
                    <ScoreRow text="Outage Duration: 7 days" points="+25 pts" />
                    <ScoreRow text="Night pedestrian safety risk" points="+20 pts" />
                    <ScoreRow text="9 duplicates clustered in Sector N-4" points="+24 pts" />
                    <ScoreRow text="High impact: University transit loop" points="+15 pts" />
                  </div>
                </Card>

                <Card icon="timer" title="SLA Enforcement">
                  <div className="cp-ops-sla-badge"><i /> APPROACHING DEADLINE</div>
                  <div className="cp-ops-sla-box">
                    <div className="cp-ops-sla-time"><span>Clock Remaining</span><strong>08h 42m</strong></div>
                    <div className="cp-ops-sla-meta"><span>Standard Target: 72 Hours</span><span>Deadline: Tomorrow, 10:00 AM</span></div>
                    <div className="cp-ops-progress"><span /></div>
                    <div className="cp-ops-progress-labels"><span>0h (Logged)</span><span>63h 18m (88% Elapsed)</span><span>72h (Breach)</span></div>
                  </div>
                  <div className="cp-ops-policy"><Icon name="policy" /> Subject to Ward 4 Infrastructure Compliance Accord.</div>
                </Card>

                <Card icon="engineering" title="Dispatch Assignment" rightIcon="verified">
                  <div className="cp-ops-assignment">
                    <Assignment label="Department" value="Electrical Maintenance Div 4" action="Reassign" onAction={() => showToast("Department reassignment opened.")} />
                    <Assignment label="Lead Dispatcher" value="Rahul Sharma (#7412)" initials="RS" action="Change" onAction={() => showToast("Lead dispatcher selector opened.")} />
                    <Assignment label="Field Unit Dispatched" value="Team 04 (Boom Truck #B-14)" sub="Lead Tech: Vance T." truck action="Ext 4082" onAction={() => showToast("Calling field unit extension 4082.")} />
                  </div>
                </Card>

                <Card icon="linear_scale" title="Lifecycle Pipeline" badge="STAGE 3 OF 4" badgeClass="plain">
                  <div className="cp-ops-pipeline">
                    <div className="cp-ops-pipeline-line"><span /></div>
                    {["NEW", "ASSIGNED", "ACTIVE", "RESOLVED"].map((step, index) => (
                      <div className={`cp-ops-step ${index < 2 ? "done" : index === 2 ? "current" : ""}`} key={step}>
                        <div>{index < 2 ? "✓" : index === 2 ? "●" : "4"}</div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <label className="cp-ops-select-label">Change Lifecycle State</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="NEW">Status: NEW (Ingest Pending)</option>
                    <option value="ASSIGNED">Status: ASSIGNED (Crew Dispatched)</option>
                    <option value="IN PROGRESS">Status: IN PROGRESS (Tech Onsite)</option>
                    <option value="PENDING PARTS">Status: PENDING PARTS (Requisition)</option>
                    <option value="RESOLVED">Status: RESOLVED (Ready for Signoff)</option>
                    <option value="CLOSED / CANCELLED">Status: CLOSED / CANCELLED</option>
                  </select>
                  <span className="cp-ops-section-label closure-label">Required For Closure</span>
                  <Checklist label="Field diagnostic multimeter log submitted" checked={checks[0]} onChange={() => setChecks((v) => v.map((x, i) => i === 0 ? !x : x))} />
                  <Checklist label="Luminaire 120W ballast replaced" checked={checks[1]} onChange={() => setChecks((v) => v.map((x, i) => i === 1 ? !x : x))} />
                  <Checklist label="Post-repair photometric capture verified" checked={checks[2]} onChange={() => setChecks((v) => v.map((x, i) => i === 2 ? !x : x))} />
                  <Checklist label="Citizen notification broadcast staged" checked={checks[3]} onChange={() => setChecks((v) => v.map((x, i) => i === 3 ? !x : x))} />
                  <button className="cp-ops-update-status" onClick={updateStatus}><Icon name="verified_user" /> Update Status & Log Transition</button>
                </Card>
              </div>

              <div className="cp-ops-col">
                <Card icon="history_edu" title="Audit Ledger" rightIcon="lock">
                  <div className="cp-ops-audit">
                    {auditEvents.map(([time, code, message, sub, tone]) => (
                      <div className="cp-ops-audit-event" key={`${time}-${code}`}>
                        <span className={`tone-${tone}`} />
                        <div className="cp-ops-audit-top"><b>{time}</b><strong className={`tone-text-${tone}`}>{code}</strong></div>
                        <p>{message}</p>
                        {sub && <code>{sub}</code>}
                      </div>
                    ))}
                  </div>
                  <button className="cp-ops-export" onClick={exportAudit}><Icon name="download" /> Export Tamper-Proof Audit JSON</button>
                </Card>

                <Card icon="hub" title="Related Cluster" badge="9 LINKED" badgeClass="plain">
                  <p className="cp-ops-muted">GIS deduplication engine bundled 9 citizen inquiries within 120m of Pole #GL-408 into this primary work order.</p>
                  <div className="cp-ops-cluster-list">
                    {clusterItems.map(([code, text, date]) => (
                      <Link to={`/admin/complaints/${code}`} key={code}>
                        <div><code>{code}</code><span>{text}</span></div><time>{date}</time>
                      </Link>
                    ))}
                  </div>
                  <button className="cp-ops-text-button" onClick={() => showToast("Showing 6 additional clustered complaints.")}>+ View 6 additional clustered complaints</button>
                </Card>

                <Card icon="receipt_long" title="Linked Work Order" badge="APPROVED" badgeClass="green-text">
                  <div className="cp-ops-work-order">
                    <div><code>WO-2026-E8821</code><span>Inventory Ward 4</span></div>
                    <strong>Luminaire 120W Ballast & Driver Replacement Kit</strong>
                    <div><span>SKU: #LUM-DRV-120</span><b>Qty: 1</b></div>
                  </div>
                  <button className="cp-ops-requisition" onClick={() => showToast("Requisition details opened.")}><Icon name="visibility" /> Open Requisition Details</button>
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

function Asset({ label, value }) {
  return <div><span>{label}</span><code>{value}</code></div>;
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
      <button onClick={onAction} className={action?.startsWith("Ext") ? "call" : ""}>
        {action?.startsWith("Ext") && <Icon name="call" />} {action}
      </button>
    </div>
  );
}

function Checklist({ label, checked, onChange }) {
  return (
    <label className={`cp-ops-check ${checked ? "checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
