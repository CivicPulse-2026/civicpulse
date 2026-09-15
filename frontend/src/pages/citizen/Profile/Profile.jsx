import CitizenLayout from "../../../components/CitizenLayout/CitizenLayout";
import { useAuth } from "../../../context/AuthContext";
import "./Profile.css";

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

const ROLE_LABEL = {
  citizen: "Citizen",
  officer: "Field Officer",
  admin: "Administrator",
};

export default function Profile() {
  const { user } = useAuth();

  const fields = [
    { icon: "badge", label: "Full name", value: user?.name },
    { icon: "mail", label: "Email", value: user?.email },
    { icon: "location_city", label: "City", value: user?.city },
    { icon: "call", label: "Phone", value: user?.phone },
    { icon: "shield_person", label: "Account type", value: ROLE_LABEL[user?.role] || user?.role },
  ];

  return (
    <CitizenLayout active="profile" title="Profile" subtitle="Your account details.">
      <div className="cp-pf-hero cp-cz-card">
        <div className="cp-pf-avatar">{initials(user?.name)}</div>
        <div>
          <h2>{user?.name || "Citizen"}</h2>
          <span className={`cp-cz-pill cp-pf-role-${user?.role || "citizen"}`}>
            {ROLE_LABEL[user?.role] || "Citizen"}
          </span>
        </div>
      </div>

      <div className="cp-pf-fields cp-cz-card">
        {fields.map((f) => (
          <div className="cp-pf-field" key={f.label}>
            <span className="cp-pf-field-icon"><Icon>{f.icon}</Icon></span>
            <div>
              <small>{f.label}</small>
              <strong>{f.value || <span className="cp-pf-empty">Not provided</span>}</strong>
            </div>
          </div>
        ))}
      </div>

      <p className="cp-pf-note">
        <Icon>info</Icon>
        Need to update your details? Contact your municipal administrator. Editable
        profiles are coming soon.
      </p>
    </CitizenLayout>
  );
}
