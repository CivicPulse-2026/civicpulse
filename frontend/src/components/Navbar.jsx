import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="cp-navbar">
      <div className="cp-container cp-nav-inner">
        {/* Brand */}
        <Link
          to="/"
          className="cp-brand"
          aria-label="CivicPulse home"
        >
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
            <rect
              width="48"
              height="48"
              rx="12"
              fill="#0F172A"
            />

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

            <circle
              cx="24"
              cy="18"
              r="1.5"
              fill="#60A5FA"
            />
          </svg>

          <span className="cp-brand-name">
            CivicPulse
          </span>

          <span className="cp-brand-badge">
            Civic Action
          </span>
        </Link>

        {/* Navigation */}
        <nav
          className="cp-nav-links"
          aria-label="Primary navigation"
        >
          <a href="/#how-it-works">
            How it works
          </a>

          <Link
            to="/citizen/complaints/CP-2026-004821"
            className="cp-nav-active"
          >
            Track Complaint
          </Link>

          <a href="/#about">
            About
          </a>
        </nav>

        {/* Actions */}
        <div className="cp-nav-actions">
          <Link
            className="cp-login-link"
            to="/auth/login"
          >
            Login
          </Link>

          <Link
            className="cp-button cp-button-primary cp-button-small"
            to="/citizen/report"
          >
            Report an Issue
          </Link>

          <div
            className="cp-avatar"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}