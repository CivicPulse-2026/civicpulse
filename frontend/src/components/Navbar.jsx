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
          <img
            alt="CivicPulse Logo"
            className="cp-logo"
            src="https://lh3.googleusercontent.com/aida/AEtjO1WtJaYtIXrqobfcf_MKtEhZLaPkvoLWEy48FfaB55wx0FhgjJrhad7JPt_-LVgM420MBCOq0UbqnlmblLhJUT2ojn-6rOJ227HK0xNrXr6cmjI8LuZKOIVPJD4V7yzfVEoGaVDyjKdo7i2VS0JlfwtxxbOVuAmxKWMsAnTeyqLdXVtRkRxqnJFSymRqDMdU_AAEeq_TDM_oWixhLX08jNkCUDH3Dq8Z_RdLBpl0b3bHlSzSRfXMJS3plgG2"
          />

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