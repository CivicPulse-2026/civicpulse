import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Human-friendly label + landing route for each role, so the navbar can
// point a signed-in user straight to the area that belongs to them.
const ROLE_META = {
  admin: { label: "Administrator", home: "/admin", homeLabel: "Dashboard" },
  officer: { label: "Field Officer", home: "/admin", homeLabel: "Dashboard" },
  citizen: { label: "Citizen", home: "/citizen", homeLabel: "My Portal" },
};

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const meta = ROLE_META[role] || {};

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="cp-navbar">
      <div className="cp-container cp-nav-inner">
        {/* Brand */}
        <Link to="/" className="cp-brand" aria-label="CivicPulse home">
          {/* CivicPulse Logo */}
          <svg
            className="cp-logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="48"
            height="48"
            fill="none"
            aria-hidden="true"
          >
            <rect width="48" height="48" rx="12" fill="#0F172A" />
            <circle
              cx="24"
              cy="24"
              r="16"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <path
              d="M14 24h5l3-6 4 12 3-8 3 4 4-2h2"
              stroke="#38BDF8"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="24"
              cy="18"
              r="3.5"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <circle cx="24" cy="18" r="1.5" fill="#60A5FA" />
          </svg>

          <span className="cp-brand-name">CivicPulse</span>
          <span className="cp-brand-badge">Civic Action</span>
        </Link>

        {/* Navigation */}
        <nav className="cp-nav-links" aria-label="Primary navigation">
          <a href="/#how-it-works">How it works</a>
          <Link to="/citizen/track">Track Complaint</Link>
          <a href="/#about">About</a>
        </nav>

        {/* Actions — reflect whether someone is signed in */}
        <div className="cp-nav-actions">
          {isAuthenticated ? (
            <>
              {meta.home && (
                <Link
                  className="cp-button cp-button-primary cp-button-small"
                  to={meta.home}
                >
                  {meta.homeLabel}
                </Link>
              )}

              <div className="cp-user-chip" title={user?.email}>
                <div className={`cp-avatar cp-avatar-${role || "guest"}`}>
                  <span>{initials(user?.name)}</span>
                </div>
                <div className="cp-user-meta">
                  <strong>{user?.name}</strong>
                  <span>{meta.label || role}</span>
                </div>
              </div>

              <button
                type="button"
                className="cp-logout-btn"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </>
          ) : (
            <>
              <Link className="cp-login-link" to="/auth/login">
                Login
              </Link>
              <Link
                className="cp-button cp-button-primary cp-button-small"
                to="/citizen/report"
              >
                Report an Issue
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
