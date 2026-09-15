import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { complaintService } from "../../../lib/services";
import { useAuth } from "../../../context/AuthContext";
import "./ReportIssue.css";

const INITIAL_DESCRIPTION =
  "There has been no street light near Gate 3 for almost a week and the road gets extremely dark.";

// Frontend option values map to the backend Category enum strings.
const categories = [
  { value: "Street Light", label: "Streetlight & Luminaire" },
  { value: "Pothole", label: "Roadbed & Pavement Defect" },
  { value: "Water / Drainage", label: "Hydraulic & Water Mains" },
  { value: "Garbage / Sanitation", label: "Sanitation & Illegal Dumping" },
  { value: "Parks / Trees", label: "Parks & Public Arboriculture" },
  { value: "Traffic Signal", label: "Traffic Signal" },
  { value: "Graffiti", label: "Graffiti" },
  { value: "Noise", label: "Noise" },
  { value: "Other", label: "Other" },
];

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function Icon({ children, className = "", filled = false }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
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
          <span className="report-context-label">Citizen Intake Portal</span>
          <span className="report-slash">/</span>
          <span className="report-id">REP-2024-SYS</span>
        </div>

        <div className="report-stepper">
          <div className="report-step report-step-complete">
            <Icon className="report-step-icon" filled>check_circle</Icon>
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
        <span className="report-char-counter">{description.length} / 600 chars</span>
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
          <button type="button" title="Speech to text input" className="report-icon-button">
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

function PhotoVerification({ photos, addPhotos, removePhoto }) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFile = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) addPhotos(files);
    event.target.value = "";
  };

  return (
    <div className="report-photo-section">
      <span className="report-field-label">Photographic Verification</span>

      {photos.map((photo, index) => (
        <div className="report-photo-tile" key={`${photo.name}-${index}`}>
          <div className="report-photo-content">
            <div className="report-photo-thumbnail">
              <img src={URL.createObjectURL(photo)} alt={photo.name} />
              <span className="report-exif">EXIF</span>
            </div>
            <div className="report-photo-info">
              <div className="report-photo-name">
                <span>{photo.name}</span>
                <Icon title="Attached">verified</Icon>
              </div>
              <span className="report-photo-meta">
                {(photo.size / (1024 * 1024)).toFixed(1)} MB • Ready to upload
              </span>
            </div>
          </div>
          <div className="report-photo-actions">
            <button
              type="button"
              onClick={() => setPreviewUrl(URL.createObjectURL(photo))}
              className="report-preview-button"
            >
              <Icon>visibility</Icon>
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => removePhoto(index)}
              title="Remove attachment"
              className="report-delete-button"
            >
              <Icon>delete</Icon>
            </button>
          </div>
        </div>
      ))}

      <div className="report-photo-footer">
        <span>Accepted formats: JPG, PNG, HEIC • Max 25MB</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="report-add-photo"
        >
          <Icon>add_photo_alternate</Icon>
          <span>Add {photos.length ? "another photo" : "a photo"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.heic"
          multiple
          onChange={handleFile}
          hidden
        />
      </div>

      {previewUrl && (
        <div className="report-photo-modal" onClick={() => setPreviewUrl(null)}>
          <div className="report-photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Photo preview" />
            <button type="button" onClick={() => setPreviewUrl(null)} className="report-modal-close">
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StructuredAttributes({
  category, setCategory, location, setLocation, priority, setPriority,
  coords, coordStatus, onLocate, photos, addPhotos, removePhoto,
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
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <Icon className="report-select-icon">unfold_more</Icon>
          </div>
        </div>

        <div className="report-field">
          <label>
            <span>Location Landmark</span>
            <span className="report-gps-label">{coords ? "GPS Locked" : "Set location"}</span>
          </label>
          <div className="report-input-wrapper">
            <Icon className="report-input-icon">pin_drop</Icon>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Nearest landmark or address"
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
              {coords
                ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "Location not captured yet"}
            </strong>
          </div>
        </div>
        <button type="button" className="report-accuracy report-locate-btn" onClick={onLocate}>
          {coordStatus || (coords ? "Update location" : "Use my location")}
        </button>
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
                className={selected ? "report-priority-option selected" : "report-priority-option"}
              >
                {selected && <span className="report-priority-dot" />}
                <span>{item}</span>
                {selected && <span className="report-selected-ring" />}
              </button>
            );
          })}
        </div>
      </div>

      <PhotoVerification photos={photos} addPhotos={addPhotos} removePhoto={removePhoto} />
    </div>
  );
}

function SpatialMap({ coords }) {
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
        <svg viewBox="0 0 400 240" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#757684" strokeDasharray="2,2" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect fill="#F1F5F9" height="100%" width="100%" />
          <rect fill="url(#grid-pattern)" height="100%" width="100%" />
          <path d="M -10 140 C 90 130, 220 180, 410 110" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="32" />
          <path d="M -10 140 C 90 130, 220 180, 410 110" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="26" />
          <path d="M -10 140 C 90 130, 220 180, 410 110" fill="none" stroke="#CBD5E1" strokeDasharray="6,6" strokeWidth="1.5" />
          <path d="M 210 155 L 210 0" fill="none" stroke="#FFFFFF" strokeLinecap="square" strokeWidth="20" />
          <path d="M 210 155 L 210 0" fill="none" stroke="#E2E8F0" strokeWidth="2" />
          <polygon fill="rgba(30,64,175,0.04)" points="120,40 340,30 380,190 80,180" stroke="#1E40AF" strokeDasharray="4,4" strokeWidth="1.5" />
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
          <div className="report-map-tooltip">Reported location</div>
        </div>

        <div className="report-coordinate-hud">
          <span />
          <span>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Awaiting GPS lock"}
          </span>
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

function AIAnalysis({ analysis, loading, accepted, onAccept }) {
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
          <span>{loading ? "Analyzing…" : analysis ? "Analysis ready" : "Idle"}</span>
        </div>
      </div>

      <div className="report-ai-heading">
        <div>
          <Icon filled>auto_awesome</Icon>
          <span>AI Analysis</span>
        </div>
        {analysis && (
          <div className="report-confidence">
            <span />
            <span>Score: {analysis.priority_score}</span>
          </div>
        )}
      </div>

      <div className="report-ai-details">
        <div className="report-ai-row report-ai-category">
          <span>Category</span>
          <div>
            <strong>{analysis?.suggested_category || "—"}</strong>
            <small>Suggested</small>
          </div>
        </div>
        <div className="report-ai-row">
          <span>Priority</span>
          <strong>{analysis?.priority || "—"}</strong>
        </div>
        <div className="report-ai-row">
          <span>SLA Target</span>
          <strong className="report-mono">
            {analysis ? `${analysis.sla_hours}h` : "—"}
          </strong>
        </div>
        <div className="report-ai-row report-ai-description">
          <span>Keywords</span>
          <strong>
            {analysis?.keywords?.length ? analysis.keywords.join(", ") : "—"}
          </strong>
        </div>
      </div>

      <div className="report-ai-helper">
        <Icon>psychology</Icon>
        <span>AI-generated suggestions. You can edit them before submitting.</span>
      </div>

      <div className="report-ai-actions">
        <button
          type="button"
          onClick={onAccept}
          disabled={!analysis}
          className={accepted ? "accepted" : ""}
        >
          <Icon>check</Icon>
          <span>{accepted ? "Suggestions Applied" : "Apply Suggestions"}</span>
        </button>
        <button type="button">
          <Icon>edit</Icon>
          <span>Edit Attributes</span>
        </button>
      </div>
    </div>
  );
}

function ComplaintSummary({ priority, category, location, submitting, submitError, onSubmit }) {
  const formattedPriority = priority.charAt(0) + priority.slice(1).toLowerCase();
  const categoryLabel =
    categories.find((c) => c.value === category)?.label || category;

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
          <span>Location:</span>
          <strong>{location || "Not set"}</strong>
        </div>
        <div>
          <span>Priority:</span>
          <strong className="report-summary-priority">{formattedPriority}</strong>
        </div>
        <div>
          <span>Category:</span>
          <strong>{categoryLabel}</strong>
        </div>
      </div>

      {submitError && (
        <div className="report-info-row" style={{ color: "var(--error)" }}>
          <Icon>error</Icon>
          <span>{submitError}</span>
        </div>
      )}

      <div className="report-summary-actions">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="report-submit-button"
        >
          <span>{submitting ? "Submitting…" : "Submit Complaint"}</span>
          {!submitting && <Icon className="report-submit-arrow">arrow_forward</Icon>}
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
  const navigate = useNavigate();
  const { user } = useAuth();

  const [description, setDescription] = useState(INITIAL_DESCRIPTION);
  const [category, setCategory] = useState("Street Light");
  const [location, setLocation] = useState("Gate 3");
  const [priority, setPriority] = useState("HIGH");
  const [photos, setPhotos] = useState([]);

  const [coords, setCoords] = useState(null);
  const [coordStatus, setCoordStatus] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Debounced live AI analysis whenever the description changes.
  useEffect(() => {
    const text = description.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      // Too short to analyse — clear any stale suggestion.
      if (text.length < 8) {
        setAnalysis(null);
        return;
      }
      setAnalyzing(true);
      setAccepted(false);
      complaintService
        .analyze(text, controller.signal)
        .then((res) => setAnalysis(res))
        .catch((err) => {
          if (err?.name !== "AbortError") setAnalysis(null);
        })
        .finally(() => setAnalyzing(false));
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [description]);

  const addPhotos = (files) => setPhotos((prev) => [...prev, ...files]);
  const removePhoto = (index) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setCoordStatus("Unsupported");
      return;
    }
    setCoordStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordStatus("");
      },
      () => setCoordStatus("Denied — enter address"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const applySuggestions = () => {
    if (!analysis) return;
    setCategory(analysis.suggested_category);
    setPriority(analysis.priority);
    setAccepted(true);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!description.trim()) {
      setSubmitError("Please describe the issue before submitting.");
      return;
    }
    // Backend requires lat/lng. Fall back to a city-center default if the
    // citizen hasn't captured GPS, so the submission still succeeds.
    const point = coords || { lat: 40.7128, lng: -74.006 };

    setSubmitting(true);
    try {
      const res = await complaintService.create(
        {
          category,
          description: description.trim(),
          lat: point.lat,
          lng: point.lng,
          address: location || undefined,
          // Attach the signed-in reporter so the complaint is attributable.
          reporter_name: user?.name || undefined,
          reporter_contact: user?.email || undefined,
        },
        photos
      );
      const created = res.complaint;
      // Route to the tracking page using the returned id/ticket.
      const trackingId = created.ticket_id || created.id;
      navigate(`/citizen/complaints/${encodeURIComponent(trackingId)}`);
    } catch (err) {
      setSubmitError(err?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pageState = useMemo(
    () => ({ description, category, location, priority }),
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

              <DescriptionCard description={description} setDescription={setDescription} />

              <StructuredAttributes
                category={category}
                setCategory={setCategory}
                location={location}
                setLocation={setLocation}
                priority={priority}
                setPriority={setPriority}
                coords={coords}
                coordStatus={coordStatus}
                onLocate={handleLocate}
                photos={photos}
                addPhotos={addPhotos}
                removePhoto={removePhoto}
              />
            </div>

            <div className="report-right-column">
              <SpatialMap coords={coords} />
              <AIAnalysis
                analysis={analysis}
                loading={analyzing}
                accepted={accepted}
                onAccept={applySuggestions}
              />
              <ComplaintSummary
                priority={priority}
                category={category}
                location={location}
                submitting={submitting}
                submitError={submitError}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
