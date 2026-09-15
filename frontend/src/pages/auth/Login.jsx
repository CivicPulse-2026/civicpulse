import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

// Demo accounts, each annotated with what the role can see/do so anyone
// landing here can immediately identify which one they want.
const DEMO_ACCOUNTS = [
  {
    role: "admin",
    label: "Administrator",
    email: "admin@civicpulse.gov",
    password: "admin123",
    icon: "shield_person",
    blurb: "Full console: operations, analytics & city-wide map.",
    accent: "admin",
  },
  {
    role: "officer",
    label: "Field Officer",
    email: "officer@civicpulse.gov",
    password: "officer123",
    icon: "engineering",
    blurb: "Handle assigned complaints and dispatch crews.",
    accent: "officer",
  },
  {
    role: "citizen",
    label: "Citizen",
    email: "citizen@civicpulse.gov",
    password: "citizen123",
    icon: "person",
    blurb: "Report civic issues and track their progress.",
    accent: "citizen",
  },
];

// Roles anyone can self-register as.
const SIGNUP_ROLES = [
  { value: "citizen", label: "Citizen", icon: "person", hint: "Report and track issues" },
  { value: "officer", label: "Field Officer", icon: "engineering", hint: "Handle assigned work" },
  { value: "admin", label: "Administrator", icon: "shield_person", hint: "Full operations console" },
];

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"

  // Shared credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up only
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("citizen");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || null;

  const routeForRole = (r) => (r === "citizen" ? "/citizen" : "/admin");

  const goAfterAuth = (user) => {
    navigate(redirectTo || routeForRole(user.role), { replace: true });
  };

  const signIn = async (emailValue, passwordValue) => {
    setError("");
    setSubmitting(true);
    try {
      const user = await login(emailValue.trim(), passwordValue);
      goAfterAuth(user);
    } catch (err) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = (event) => {
    event.preventDefault();
    signIn(email, password);
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        city: city.trim(),
        role,
      });
      goAfterAuth(user);
    } catch (err) {
      setError(err?.message || "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // One-click demo sign-in: fill the form and authenticate immediately.
  const signInAsDemo = (account) => {
    setMode("signin");
    setEmail(account.email);
    setPassword(account.password);
    signIn(account.email, account.password);
  };

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  return (
    <div className="cp-login-page">
      <div className="cp-login-card">
        <div className="cp-login-brand">
          <div className="cp-login-logo">
            <Icon>hub</Icon>
          </div>
          <div>
            <strong>CivicPulse</strong>
            <span>Municipal Operations</span>
          </div>
        </div>

        {/* Sign in / Sign up toggle */}
        <div className="cp-login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
          >
            Create account
          </button>
        </div>

        <p className="cp-login-subtitle">
          {mode === "signin"
            ? "Access the civic operations console and citizen services."
            : "Sign up with your email and city to start using CivicPulse."}
        </p>

        {error && (
          <div className="cp-login-error" role="alert">
            <Icon>error</Icon>
            <span>{error}</span>
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="cp-login-form">
            <label className="cp-login-field">
              <span>Email</span>
              <div className="cp-login-input">
                <Icon>mail</Icon>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="cp-login-field">
              <span>Password</span>
              <div className="cp-login-input">
                <Icon>lock</Icon>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </label>

            <button type="submit" className="cp-login-submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
              {!submitting && <Icon>arrow_forward</Icon>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="cp-login-form">
            {/* Role picker — any category can register */}
            <div className="cp-signup-roles" role="radiogroup" aria-label="Account type">
              {SIGNUP_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={role === r.value}
                  className={`cp-signup-role ${role === r.value ? "selected" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <Icon>{r.icon}</Icon>
                  <strong>{r.label}</strong>
                  <small>{r.hint}</small>
                </button>
              ))}
            </div>

            <label className="cp-login-field">
              <span>Full name</span>
              <div className="cp-login-input">
                <Icon>badge</Icon>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Citizen"
                  required
                  minLength={2}
                />
              </div>
            </label>

            <label className="cp-login-field">
              <span>Email</span>
              <div className="cp-login-input">
                <Icon>mail</Icon>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="cp-login-field">
              <span>City</span>
              <div className="cp-login-input">
                <Icon>location_city</Icon>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Your city (e.g. Brooklyn)"
                  required
                  minLength={2}
                />
              </div>
            </label>

            <label className="cp-login-field">
              <span>Password</span>
              <div className="cp-login-input">
                <Icon>lock</Icon>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </label>

            <button type="submit" className="cp-login-submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
              {!submitting && <Icon>arrow_forward</Icon>}
            </button>
          </form>
        )}

        {mode === "signin" && (
          <div className="cp-login-demo">
            <span>Sign in as a demo role</span>
            <div className="cp-login-roles">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className={`cp-role-card cp-role-${account.accent}`}
                  onClick={() => signInAsDemo(account)}
                  disabled={submitting}
                >
                  <span className="cp-role-icon">
                    <Icon>{account.icon}</Icon>
                  </span>
                  <span className="cp-role-text">
                    <strong>{account.label}</strong>
                    <small>{account.blurb}</small>
                  </span>
                  <Icon className="cp-role-arrow">arrow_forward</Icon>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
