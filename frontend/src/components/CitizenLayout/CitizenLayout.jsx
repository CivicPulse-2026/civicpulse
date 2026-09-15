import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./CitizenLayout.css";

// Section navigation shared by every citizen page, so people always know
// where they are and how to get to Report / My Complaints / Profile.
const NAV_ITEMS = [
  { key: "home", icon: "home", label: "Home", path: "/citizen" },
  { key: "report", icon: "add_circle", label: "Report an Issue", path: "/citizen/report" },
  { key: "complaints", icon: "receipt_long", label: "My Complaints", path: "/citizen/complaints" },
  { key: "track", icon: "travel_explore", label: "Track by ID", path: "/citizen/track" },
  { key: "profile", icon: "person", label: "Profile", path: "/citizen/profile" },
];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export default function CitizenLayout({ active, title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (item) =>
    active ? active === item.key : location.pathname === item.path;

  return (
    <div className="cp-cz-page">
      <aside className="cp-cz-sidebar">
        <Link to="/citizen" className="cp-cz-brand" aria-label="CivicPulse home">
          <span className="cp-cz-logo">
            <Icon>hub</Icon>
          </span>
          <span>
            <strong>CivicPulse</strong>
            <small>Citizen Portal</small>
          </span>
        </Link>

        <nav className="cp-cz-nav" aria-label="Citizen navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              aria-current={isActive(item) ? "page" : undefined}
              className={`cp-cz-nav-item ${isActive(item) ? "active" : ""}`}
            >
              <Icon>{item.icon}</Icon>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="cp-cz-sidebar-foot">
          <div className="cp-cz-user">
            <div className="cp-cz-avatar">{initials(user?.name)}</div>
            <div className="cp-cz-user-meta">
              <strong>{user?.name || "Citizen"}</strong>
              <small>{user?.city || user?.email}</small>
            </div>
          </div>
          <button type="button" className="cp-cz-logout" onClick={handleLogout}>
            <Icon>logout</Icon>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="cp-cz-shell">
        <header className="cp-cz-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="cp-cz-header-actions">{actions}</div>}
        </header>
        <main className="cp-cz-main">{children}</main>
      </div>
    </div>
  );
}
