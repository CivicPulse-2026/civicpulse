import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const pipeline = [
  ["01 // INTAKE", "edit_note", "Report", "Resident submits issue via voice, web portal, or mobile snap with zero bureaucratic friction.", "GEO-TAG • PHOTO UPLOAD"],
  ["02 // COGNITION", "psychology", "Understand", "Multi-modal AI classifies infrastructure department, vector location, and public hazard scores.", "LLM TRIAGE • CLUSTER MATCH"],
  ["03 // POLICY", "hourglass_top", "Prioritize", "Automated SLA allocation based on safety regulations, density metrics, and municipal guidelines.", "SLA ASSIGNMENT • P1-P4"],
  ["04 // DISPATCH", "local_shipping", "Assign", "Direct routing to the nearest active municipal truck or authorized public utility crew.", "CREW TELEMETRY • INVENTORY"],
  ["05 // CLOSURE", "verified", "Resolve", "Post-repair inspection photo required. Automated confirmation sent to the reporting citizen.", "IMAGE AUDIT • PUBLIC LOG"],
];

const features = [
  ["smart_toy", "AI-Powered Understanding", 'Transforms ambiguous reports like "big hole near park corner" into structured geo-referenced CAD tickets instantly.', "NLP Severity Grading", "green"],
  ["crisis_alert", "Smart Prioritization", "Automated danger scoring distinguishes broken sidewalks from high-voltage exposed wiring, protecting citizen life first.", "OSHA & City Hazard Matrices", "blue"],
  ["hub", "Duplicate Issue Detection", "High-dimensional vector clustering merges 80 resident complaints about the same water outage into a single incident thread.", "Deduplication Ratio: 3.4x", "green"],
  ["location_on", "Real-Time Tracking", "Constituents receive SMS and Webhook notifications as crews accept work orders, arrive on site, and complete tasks.", "Sub-second Status Sync", "blue"],
  ["alarm", "SLA Monitoring", "Proactive timer alerts escalate stagnant tickets to municipal directors before public safety guidelines are breached.", "Auto-Escalation Engine", "red"],
  ["monitoring", "City Intelligence", "Spatial density heatmaps identify repeat pipe bursts or streetlight grids requiring comprehensive capital overhaul.", "Predictive Capital Budgeting", "green"],
];

const interventions = [
  ["CP-2024-8921", "Main St. Traffic Signal Desync", "Ward 4 (Downtown Corridor)", "Urgent", "urgent", "Dispatched (Crew 09)", "dark", "24m ago"],
  ["CP-2024-8919", "Downed Oak Branch on Bike Path", "Ward 7 (West Greenbelt)", "Normal", "normal", "Verified Resolved", "green", "1h 12m ago"],
  ["CP-2024-8914", "Park Playground Surface Repair", "Ward 2 (Highland Park)", "Routine", "routine", "In Review", "blue", "3h 40m ago"],
];

function MetricCard({ label, icon, value, suffix, detail, accent, visual }) {
  return (
    <div className="cp-metric-card">
      <div className="cp-metric-heading"><span>{label}</span><span className={`material-symbols-outlined ${accent}`}>{icon}</span></div>
      <div className="cp-metric-value-row"><span className="cp-metric-value">{value}</span><span className={`cp-metric-suffix ${accent}`}>{suffix}</span></div>
      <div className="cp-metric-detail">
        <span>{detail}</span>
        {visual === "up" && <svg className="cp-spark" viewBox="0 0 60 16"><path d="M0 12 L12 10 L24 13 L36 7 L48 9 L60 2" /></svg>}
        {visual === "progress" && <div className="cp-progress"><div /></div>}
        {visual === "down" && <svg className="cp-spark cp-spark-green" viewBox="0 0 60 16"><path d="M0 4 L15 6 L30 11 L45 13 L60 15" /></svg>}
        {visual === "optimal" && <span className="cp-optimal">OPTIMAL</span>}
      </div>
    </div>
  );
}

function RadarVisual() {
  return (
    <div className="cp-radar-card">
      <div className="cp-radar-header">
        <div className="cp-radar-title"><span className="material-symbols-outlined">satellite_alt</span><span>GEO-DISPATCH // DISTRICT 04</span></div>
        <div className="cp-radar-coordinates"><span>37.7749° N, 122.4194° W</span><span className="cp-live-badge">LIVE</span></div>
      </div>

      <div className="cp-radar-map">
        <svg className="cp-grid-svg" viewBox="0 0 540 380" preserveAspectRatio="none">
          <defs><pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="currentColor" strokeOpacity=".6" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#city-grid)" />
          <path d="M-50,80 L480,420" stroke="currentColor" strokeDasharray="6,6" strokeWidth="3" />
          <path d="M120,-30 L280,420" stroke="currentColor" strokeWidth="4" />
          <path d="M-20,240 L520,180" stroke="currentColor" strokeWidth="3" />
          <circle cx="270" cy="190" fill="none" r="80" stroke="currentColor" strokeDasharray="3,3" />
          <circle cx="270" cy="190" fill="none" r="140" stroke="currentColor" strokeDasharray="2,5" />
        </svg>
        <div className="cp-pulse-zone cp-pulse-zone-one" /><div className="cp-pulse-zone cp-pulse-zone-two" />

        <div className="cp-map-pin cp-pin-one"><span className="cp-pin-dot cp-amber" /><div><strong>Streetlight Outage #4821</strong><small><span className="material-symbols-outlined">timer</span>SLA: 04h 12m</small></div></div>
        <div className="cp-map-pin cp-pin-two"><span className="cp-pin-dot cp-red pulse" /><div><div className="cp-pin-title-line"><strong>Water Main Leak</strong><em>P1 Critical</em></div><small className="cp-error-text">Crew Dispatched • 18m ETA</small></div></div>
        <div className="cp-map-pin cp-pin-three"><span className="cp-pin-dot cp-green" /><div><strong>Pothole Repair #3902</strong><small className="cp-success-text">Verified Cleared • 100%</small></div></div>

        <div className="cp-radar-center"><div><span /></div></div>
      </div>

      <div className="cp-radar-telemetry"><span><span className="material-symbols-outlined">sensors</span>AUTONOMOUS DISPATCH ACTIVE</span><span>24 UNITS ENGAGED</span></div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="cp-page">
      <Navbar />
      <main className="cp-main">
        <section className="cp-container cp-hero">
          <div className="cp-hero-grid">
            <div className="cp-hero-copy">
              <div className="cp-release-pill"><span className="cp-ping-wrap"><span className="cp-ping" /><span className="cp-ping-core" /></span><span>Intelligent Civic Operations</span><span className="cp-separator">•</span><span className="cp-code">v2.4.1 Production</span></div>
              <h1>Report an Issue.<br /><span>Improve Your City.</span></h1>
              <p>CivicPulse turns citizen complaints into actionable civic issues, helping municipal teams triage faster, coordinate field units, and build resilient infrastructure.</p>
              <div className="cp-hero-actions">
                <Link className="cp-button cp-button-primary cp-button-large" to="/citizen/report">Report an Issue <span className="material-symbols-outlined">arrow_forward</span></Link>
                <a className="cp-button cp-button-secondary cp-button-large" href="#track-complaint"><span className="material-symbols-outlined">search</span>Track a Complaint</a>
              </div>
              <div className="cp-telemetry-line"><span><i className="cp-status-dot cp-status-dot-green" /> API Gateway Online</span><span>/</span><span>LATENCY: 42ms</span><span>/</span><span>ISO 27001 COMPLIANT</span></div>
            </div>
            <div><RadarVisual /></div>
          </div>
        </section>

        <section className="cp-trust-bar"><div className="cp-container cp-metrics">
          <MetricCard label="Issues Reported" icon="receipt_long" value="2,481" suffix="+12% mo" detail="Aggregated 30d" accent="cp-blue-text" visual="up" />
          <MetricCard label="Issues Resolved" icon="task_alt" value="1,797" suffix="Active field" detail="72.4% clearance" accent="cp-green-text" visual="progress" />
          <MetricCard label="SLA Compliance" icon="verified" value="91.4%" suffix=">90% Goal" detail="Municipal standard" accent="cp-blue-text" visual="optimal" />
          <MetricCard label="Avg. Resolution" icon="speed" value="38.6" suffix="hrs" detail="-14.2 hrs YoY" accent="cp-green-text" visual="down" />
        </div></section>

        <section id="how-it-works" className="cp-container cp-section">
          <div className="cp-section-heading-row"><div><span className="cp-eyebrow">CIVIC INFRASTRUCTURE PIPELINE</span><h2>From Report to Resolution</h2><p>A transparent, automated pipeline coordinating citizens, AI classification, and municipal field authorities.</p></div><div className="cp-latency-badge">TOTAL PIPELINE LATENCY: &lt; 40 SECONDS</div></div>
          <div className="cp-pipeline">{pipeline.map(([number, icon, title, description, meta], i) => (
            <article className="cp-pipeline-card" key={number}><div className="cp-card-top"><span className={i === 4 ? "cp-green-text" : "cp-blue-text"}>{number}</span><span className={`cp-icon-box ${i === 4 ? "cp-icon-green" : ""}`}><span className="material-symbols-outlined">{icon}</span></span></div><div><h3>{title}</h3><p>{description}</p></div><div className="cp-card-meta">{meta}</div></article>
          ))}</div>
        </section>

        <section id="about" className="cp-feature-section"><div className="cp-container">
          <div className="cp-feature-heading"><span className="cp-eyebrow">ENGINEERED FOR GOVERNANCE</span><h2>Built for high-density municipal operations</h2><p>Engineered like modern developer infrastructure to eliminate friction, prevent duplication, and preserve public accountability.</p></div>
          <div className="cp-feature-grid">{features.map(([icon, title, description, meta, tone]) => (
            <article className="cp-feature-card" key={title}><div><div className="cp-feature-icon"><span className="material-symbols-outlined">{icon}</span></div><h3>{title}</h3><p>{description}</p></div><div className="cp-feature-meta"><span className={`cp-status-dot cp-status-dot-${tone}`} /><span>{meta}</span></div></article>
          ))}</div>
        </div></section>

        <section id="track-complaint" className="cp-container cp-section"><div className="cp-stream-card">
          <div className="cp-stream-header"><div><div className="cp-stream-label"><span className="cp-status-dot cp-status-dot-green" /> PUBLIC STREAM FEED</div><h3>Recent Municipal Interventions</h3></div><span className="cp-autosync">AUTOSYNC: 5s</span></div>
          <div className="cp-table-wrap"><table className="cp-table"><thead><tr><th>Ticket ID</th><th>Incident Category</th><th>Zone / Ward</th><th>Priority</th><th>Status</th><th>Elapsed</th></tr></thead><tbody>
            {interventions.map(([id, category, ward, priority, priorityClass, status, statusClass, elapsed]) => (
              <tr key={id}><td className="cp-ticket">{id}</td><td className="cp-table-main">{category}</td><td>{ward}</td><td><span className={`cp-priority cp-priority-${priorityClass}`}>{priority}</span></td><td><span className={`cp-table-status cp-status-${statusClass}`}><span className="cp-status-dot" />{status}</span></td><td className="cp-elapsed">{elapsed}</td></tr>
            ))}
          </tbody></table></div>
        </div></section>

        <section className="cp-container cp-final-cta"><div className="cp-final-panel"><div className="cp-final-grid" />
          <div className="cp-final-copy"><span className="cp-eyebrow">CITIZEN COOPERATION PROTOCOL</span><h2>Your report can become civic action.</h2><p>Join over 40,000 residents making municipal infrastructure transparent, resilient, and instantly accountable.</p></div>
          <div className="cp-final-actions"><Link className="cp-button cp-button-primary cp-button-large" to="/citizen/report">Report an Issue <span className="material-symbols-outlined">arrow_forward</span></Link><a className="cp-button cp-button-muted cp-button-large" href="/municipal">Municipal Portal</a></div>
        </div></section>
      </main>
      <Footer />
    </div>
  );
}
