// Guards admin routes: requires an authenticated staff user (officer/admin).
// Unauthenticated users are sent to /auth/login, preserving where they wanted to go.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireStaff = true }) {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Geist, sans-serif",
          color: "#64748b",
        }}
      >
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/" replace />;
  }

  return children;
}
