import { Link, useLocation } from "react-router-dom";
import "./AdminSidebar.css";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", icon: "dashboard", label: "Dashboard", path: "/admin" },
    ],
  },
  {
    title: "Operations",
    items: [
      { key: "complaints", icon: "inbox", label: "Complaints", badge: "24", path: "/admin/complaints" },
      { key: "assignments", icon: "how_to_reg", label: "Assignments", path: "/admin/assignments" },
      { key: "sla-monitor", icon: "alarm_on", label: "SLA Monitor", dot: true, path: "/admin/sla" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { key: "issue-clusters", icon: "hub", label: "Issue Clusters", path: "/admin/clusters" },
      { key: "city-map", icon: "map", label: "City Map", path: "/admin/map" },
      { key: "analytics", icon: "query_stats", label: "Analytics", path: "/admin/analytics" },
    ],
  },
  {
    title: "Management",
    items: [
      { key: "departments", icon: "corporate_fare", label: "Departments", path: "/admin/departments" },
      { key: "users", icon: "group", label: "Users", path: "/admin/users" },
      { key: "settings", icon: "settings", label: "Settings", path: "/admin/settings" },
    ],
  },
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function AdminSidebar({ activeKey = "dashboard", onLogout }) {
  const location = useLocation();

  const isActive = (item) => {
    if (activeKey) return activeKey === item.key;
    if (item.key === "dashboard") return location.pathname === "/admin";
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className="cp-admin-sidebar">
      <div className="cp-admin-sidebar-main">
        <div className="cp-admin-brand">
          <Link to="/admin" className="cp-admin-brand-link" aria-label="CivicPulse Operations">
            <img
              alt="CivicPulse"
              src="https://lh3.googleusercontent.com/aida/AEtjO1WtJaYtIXrqobfcf_MKtEhZLaPkvoLWEy48FfaB55wx0FhgjJrhad7JPt_-LVgM420MBCOq0UbqnlmblLhJUT2ojn-6rOJ227HK0xNrXr6cmjI8LuZKOIVPJD4V7yzfVEoGaVDyjKdo7i2VS0JlfwtxxbOVuAmxKWMsAnTeyqLdXVtRkRxqnJFSymRqDMdU_AAEeq_TDM_oWixhLX08jNkCUDH3Dq8Z_RdLBpl0b3bHlSzSRfXMJS3plgG2"
            />
            <div>
              <div className="cp-admin-brand-name">
                <span>CivicPulse</span>
                <span className="cp-admin-ops-badge">OPS</span>
              </div>
              <span className="cp-admin-municipal">Municipal Core</span>
            </div>
          </Link>
        </div>

        <nav className="cp-admin-nav" aria-label="Municipal operations navigation">
          {NAV_SECTIONS.map((section) => (
            <div className="cp-admin-nav-section" key={section.title}>
              <div className="cp-admin-nav-heading">{section.title}</div>
              <div className="cp-admin-nav-items">
                {section.items.map((item) => {
                  const active = isActive(item);

                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`cp-admin-sidebar-item ${active ? "active" : ""}`}
                    >
                      <span className="cp-sidebar-item-left">
                        <MaterialIcon>{item.icon}</MaterialIcon>
                        <span>{item.label}</span>
                      </span>

                      {item.badge && (
                        <span className="cp-sidebar-badge">{item.badge}</span>
                      )}

                      {item.dot && <span className="cp-sidebar-dot" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="cp-admin-user">
        <div className="cp-admin-user-row">
          <div className="cp-admin-user-info">
            <div className="cp-admin-avatar-wrap">
              <div className="cp-admin-avatar">
                <MaterialIcon>person</MaterialIcon>
              </div>
              <span className="cp-admin-online" />
            </div>

            <div className="cp-admin-user-copy">
              <p>Rahul Sharma</p>
              <span>Director · Ward 4</span>
            </div>
          </div>

          <button
            type="button"
            title="Sign out"
            onClick={onLogout}
            className="cp-admin-logout"
          >
            <MaterialIcon>logout</MaterialIcon>
          </button>
        </div>
      </div>
    </aside>
  );
}
