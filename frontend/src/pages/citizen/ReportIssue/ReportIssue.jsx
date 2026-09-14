import { useMemo, useRef, useState } from "react";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import "./ReportIssue.css";

const INITIAL_DESCRIPTION =
  "There has been no street light near Gate 3 for almost a week and the road gets extremely dark.";

const categories = [
  { value: "streetlight", label: "Streetlight & Luminaire" },
  { value: "pothole", label: "Roadbed & Pavement Defect" },
  { value: "water", label: "Hydraulic & Water Mains" },
  { value: "waste", label: "Sanitation & Illegal Dumping" },
  { value: "parks", label: "Parks & Public Arboriculture" },
];

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const PHOTO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCA72fPXc9rmPEkIUrXHalc8lozXaJehqnCKY45ts4hk1UZks8Af8AF3Ha6TWYE4gBsvGsfrCEoCx0k59nuRxWel2E9zauIbkadK2dvshkQ-vlY7XQKyRhZxKV4mXWMSBQ9w8snk_-BPhRQbLYe-8JoAZu-iSXrfaU6cN4gMQkZi-BoTgAntGM2Jt8_vDcmvjHrkusB4D4G3rqoBHepkoYNiM1S1UPDT5XvzSR4HnhAb0NW8ZHTUabH7A";

function Icon({ children, className = "", filled = false }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? {
              fontVariationSettings:
                "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

function ProgressRail() {
  return (
    <section className="report-progress">
      <div className="report-progress-inner">
        <div className="report-context">
          <span className="report-live-dot" />
          <span className="report-context-label">
            Citizen Intake Portal
          </span>
          <span className="report-slash">/</span>
          <span className="report-id">REP-2024-SYS</span>
        </div>

        <div className="report-stepper">
          <div className="report-step report-step-complete">
            <Icon className="report-step-icon" filled>
              check_circle
            </Icon>
            <span>1 Describe</span>
          </div>

          <span className="report-step-line report-line-active" />

          <div className="report-step report-step-active">
            <span className="report-step-number">2</span>
            <span>Location</span>
          </div>

          <span className="report-step-line" />

          <div className="report-step report-step-next">
            <span className="report-step-number">3</span>
            <span>Review</span>
          </div>

          <span className="report-step-line" />

          <div className="report-step report-step-disabled">
            <span className="report-step-number">4</span>
            <span>Submit</span>
          </div>
        </div>

        <div className="report-engine-status">
          <Icon className="report-engine-icon">bolt</Icon>
          <span>Verified Geo-Engine • SLA &lt; 2h</span>
        </div>
      </div>
    </section>
  );
}

function DescriptionCard({ description, setDescription }) {
  return (
    <div className="report-card report-description-card">
      <div className="report-card-heading">
        <label htmlFor="issue-description" className="report-field-title">
          <span>Natural Description</span>

          <span className="report-voice-badge">Voice or Text</span>
        </label>

        <span className="report-char-counter">
          {description.length} / 600 chars
        </span>
      </div>

      <div className="report-textarea-wrapper">
        <textarea
          id="issue-description"
          rows={4}
          maxLength={600}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the physical condition, landmark, or hazard in plain speech..."
          className="report-description-input"
        />

        <div className="report-textarea-actions">
          <button
            type="button"
            title="Speech to text input"
            className="report-icon-button"
          >
            <Icon>mic</Icon>
          </button>

          <span className="report-action-divider" />

          <Icon className="report-auto-icon">auto_fix_high</Icon>

          <span className="report-auto-text">Auto-parsed</span>
        </div>
      </div>

      <div className="report-info-row">
        <Icon>info</Icon>

        <span>
          Natural language engine auto-fills the classification parameters
          below in real-time.
        </span>
      </div>
    </div>
  );
}

function PhotoVerification() {
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      setPhoto(true);
    }
  };

  return (
    <div className="report-photo-section">
      <span className="report-field-label">Photographic Verification</span>

      {photo && (
        <div className="report-photo-tile">
          <div className="report-photo-content">
            <div className="report-photo-thumbnail">
              <img
                src={PHOTO_URL}
                alt="Nighttime photo of an unlit streetlight near Gate 3"
              />

              <span className="report-exif">EXIF</span>
            </div>

            <div className="report-photo-info">
              <div className="report-photo-name">
                <span>night_gate3_dark.jpg</span>

                <Icon title="Metadata verified">verified</Icon>
              </div>

              <span className="report-photo-meta">
                1.8 MB • Geotag Matched (37.7749° N, 122.4194° W)
              </span>
            </div>
          </div>

          <div className="report-photo-actions">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="report-preview-button"
            >
              <Icon>visibility</Icon>
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setPhoto(false)}
              title="Remove attachment"
              className="report-delete-button"
            >
              <Icon>delete</Icon>
            </button>
          </div>
        </div>
      )}

      <div className="report-photo-footer">
        <span>Accepted formats: JPG, PNG, HEIC • Max 25MB</span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="report-add-photo"
        >
          <Icon>add_photo_alternate</Icon>
          <span>Add another photo</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.heic"
          onChange={handleFile}
          hidden
        />
      </div>

      {previewOpen && (
        <div
          className="report-photo-modal"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="report-photo-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={PHOTO_URL} alt="Photo preview" />

            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="report-modal-close"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StructuredAttributes({
  category,
  setCategory,
  location,
  setLocation,
  priority,
  setPriority,
}) {
  return (
    <div className="report-card report-attributes-card">
      <div className="report-attributes-header">
        <h2>Structured Attributes</h2>

        <span>Classification Tier</span>
      </div>

      <div className="report-form-grid">
        <div className="report-field">
          <label>
            <span>Infrastructure Category</span>

            <span className="report-parsed-label">Parsed via text</span>
          </label>

          <div className="report-select-wrapper">
            <Icon className="report-input-icon">lightbulb</Icon>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <Icon className="report-select-icon">unfold_more</Icon>
          </div>
        </div>

        <div className="report-field">
          <label>
            <span>Location Landmark</span>

            <span className="report-gps-label">GPS Locked</span>
          </label>

          <div className="report-input-wrapper">
            <Icon className="report-input-icon">pin_drop</Icon>

            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="report-geolocation">
        <div className="report-geolocation-content">
          <div className="report-location-icon">
            <Icon>my_location</Icon>
          </div>

          <div className="report-geolocation-text">
            <span>Matched Asset Geolocation</span>

            <strong>
              Main Campus North Peripheral Road • Sector 04-B
            </strong>
          </div>
        </div>

        <span className="report-accuracy">Accuracy: 1.4m</span>
      </div>

      <div className="report-priority-section">
        <div className="report-priority-header">
          <span>Severity & Urgency Tier</span>
          <small>Constituent assessment</small>
        </div>

        <div className="report-priority-selector">
          {priorities.map((item) => {
            const selected = priority === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setPriority(item)}
                className={
                  selected
                    ? "report-priority-option selected"
                    : "report-priority-option"
                }
              >
                {selected && <span className="report-priority-dot" />}
                <span>{item}</span>
                {selected && <span className="report-selected-ring" />}
              </button>
            );
          })}
        </div>
      </div>

      <PhotoVerification />
    </div>
  );
}

function SpatialMap() {
  return (
    <div className="report-card report-map-card">
      <div className="report-map-header">
        <div>
          <Icon>map</Icon>
          <span>Spatial Boundary Preview</span>
        </div>

        <span>GRID #402-N</span>
      </div>

      <div className="report-map">
        <svg
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid-pattern"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#757684"
                strokeDasharray="2,2"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>

          <rect fill="#F1F5F9" height="100%" width="100%" />
          <rect fill="url(#grid-pattern)" height="100%" width="100%" />

          <path
            d="M -10 140 C 90 130, 220 180, 410 110"
            fill="none"
            stroke="#E2E8F0"
            strokeLinecap="round"
            strokeWidth="32"
          />

          <path
            d="M -10 140 C 90 130, 220 180, 410 110"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="26"
          />

          <path
            d="M -10 140 C 90 130, 220 180, 410 110"
            fill="none"
            stroke="#CBD5E1"
            strokeDasharray="6,6"
            strokeWidth="1.5"
          />

          <path
            d="M 210 155 L 210 0"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="square"
            strokeWidth="20"
          />

          <path
            d="M 210 155 L 210 0"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
          />

          <polygon
            fill="rgba(30,64,175,0.04)"
            points="120,40 340,30 380,190 80,180"
            stroke="#1E40AF"
            strokeDasharray="4,4"
            strokeWidth="1.5"
          />

          <circle cx="95" cy="138" fill="#006A61" r="3.5" />
          <circle cx="330" cy="130" fill="#006A61" r="3.5" />
          <circle cx="210" cy="65" fill="#006A61" r="3.5" />
        </svg>

        <div className="report-target-pin">
          <span className="report-pulse pulse-one" />
          <span className="report-pulse pulse-two" />

          <div className="report-pin-head">
            <Icon>lightbulb_outline</Icon>
          </div>

          <div className="report-map-tooltip">
            Pole #SL-094 • Gate 3
          </div>
        </div>

        <div className="report-coordinate-hud">
          <span />
          <span>37.7749° N, 122.4194° W</span>
        </div>

        <div className="report-compass">N</div>
      </div>

      <div className="report-map-footer">
        <span>Ward: Central North District</span>

        <span>Zone Maintenance: Active</span>
      </div>
    </div>
  );
}

function AIAnalysis() {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="report-card report-ai-card">
      <div className="report-ai-decoration" />

      <div className="report-ai-status">
        <div className="report-ai-engine">
          <Icon>sync</Icon>
          <span>CivicPulse AI Engine</span>
        </div>

        <div className="report-ai-completed">
          <Icon>done_all</Icon>
          <span>Completed in 320ms</span>
        </div>
      </div>

      <div className="report-ai-heading">
        <div>
          <Icon filled>auto_awesome</Icon>
          <span>AI Analysis</span>
        </div>

        <div className="report-confidence">
          <span />
          <span>Confidence: 94%</span>
        </div>
      </div>

      <div className="report-ai-details">
        <div className="report-ai-row report-ai-category">
          <span>Category</span>

          <div>
            <strong>Streetlight</strong>
            <small>High Conf.</small>
          </div>
        </div>

        <div className="report-ai-row report-ai-description">
          <span>Issue Extracted</span>

          <strong>Streetlight near Gate 3 is non-functional</strong>
        </div>

        <div className="report-ai-row">
          <span>Location</span>

          <strong>Gate 3 (North Entrance Corridor)</strong>
        </div>

        <div className="report-ai-row">
          <span>Duration</span>

          <strong className="report-mono">
            ~7 days (chronic outage)
          </strong>
        </div>

        <div className="report-ai-row">
          <span>Hazard Level</span>

          <div className="report-hazard">
            <span />
            <strong>Medium / Elevated hazard at night</strong>
          </div>
        </div>
      </div>

      <div className="report-ai-helper">
        <Icon>psychology</Icon>

        <span>
          AI-generated suggestions. You can edit them before submitting.
        </span>
      </div>

      <div className="report-ai-actions">
        <button
          type="button"
          onClick={() => setAccepted(true)}
          className={accepted ? "accepted" : ""}
        >
          <Icon>check</Icon>
          <span>
            {accepted ? "Analysis Accepted" : "Accept Analysis"}
          </span>
        </button>

        <button type="button">
          <Icon>edit</Icon>
          <span>Edit Attributes</span>
        </button>
      </div>
    </div>
  );
}

function ComplaintSummary({ priority }) {
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const formattedPriority =
    priority.charAt(0) + priority.slice(1).toLowerCase();

  return (
    <div className="report-card report-summary-card">
      <div className="report-summary-header">
        <div>
          <span>Stage 4 Readiness</span>
          <h3>Complaint Summary</h3>
        </div>

        <span className="report-ready-badge">
          <span />
          Ready
        </span>
      </div>

      <div className="report-summary-details">
        <div>
          <span>Issue:</span>
          <strong>Streetlight near Gate 3 is non-functional</strong>
        </div>

        <div>
          <span>Location:</span>
          <strong>Gate 3, North Corridor</strong>
        </div>

        <div>
          <span>Priority:</span>
          <strong className="report-summary-priority">
            {formattedPriority} (Safety Priority Level 2)
          </strong>
        </div>

        <div>
          <span>Category:</span>
          <strong>Electrical & Public Lighting</strong>
        </div>
      </div>

      <div className="report-summary-actions">
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="report-submit-button"
        >
          <span>
            {submitted ? "Complaint Submitted" : "Submit Complaint"}
          </span>

          {!submitted && (
            <Icon className="report-submit-arrow">arrow_forward</Icon>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSaved(true)}
          className="report-draft-button"
        >
          <Icon>{saved ? "bookmark" : "bookmark_border"}</Icon>
          <span>{saved ? "Draft Saved" : "Save Draft for Later"}</span>
        </button>
      </div>

      <div className="report-summary-notice">
        <Icon>verified_user</Icon>

        <span>
          Your report will be assigned a public tracking ID immediately upon
          submission. Municipal teams receive real-time telemetry dispatch.
        </span>
      </div>
    </div>
  );
}

export default function ReportIssue() {
  const [description, setDescription] = useState(INITIAL_DESCRIPTION);
  const [category, setCategory] = useState("streetlight");
  const [location, setLocation] = useState("Gate 3");
  const [priority, setPriority] = useState("HIGH");

  const pageState = useMemo(
    () => ({
      description,
      category,
      location,
      priority,
    }),
    [description, category, location, priority]
  );

  void pageState;

  return (
    <div className="report-page">
      <Navbar />

      <main className="report-main">
        <ProgressRail />

        <div className="report-content">
          <div className="report-layout">
            <div className="report-left-column">
              <div className="report-page-heading">
                <div className="report-heading-kicker">
                  <Icon>campaign</Icon>
                  <span>Direct Municipal Service Pipe</span>
                </div>

                <h1>Report a Civic Issue</h1>

                <p>
                  Tell us what’s happening. You can describe the issue
                  naturally—we&apos;ll automatically structure, categorize,
                  and cross-reference municipal asset telemetry.
                </p>
              </div>

              <DescriptionCard
                description={description}
                setDescription={setDescription}
              />

              <StructuredAttributes
                category={category}
                setCategory={setCategory}
                location={location}
                setLocation={setLocation}
                priority={priority}
                setPriority={setPriority}
              />
            </div>

            <div className="report-right-column">
              <SpatialMap />
              <AIAnalysis />
              <ComplaintSummary priority={priority} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}