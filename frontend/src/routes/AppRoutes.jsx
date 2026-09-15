import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/public/LandingPage";
import NotFound from "../pages/public/NotFound";
import Login from "../pages/auth/Login";
import CitizenDashboard from "../pages/citizen/CitizenDashboard/CitizenDashboard";
import MyComplaints from "../pages/citizen/MyComplaints/MyComplaints";
import Profile from "../pages/citizen/Profile/Profile";
import ReportIssue from "../pages/citizen/ReportIssue/ReportIssue";
import ComplaintTracking from "../pages/citizen/ComplaintTracking/ComplaintTracking";
import AdminDashboard from "../pages/admin/AdminDashboard/AdminDashboard";
import ComplaintQueue from "../pages/admin/ComplaintQueue/ComplaintQueue";
import ComplaintOperations from "../pages/admin/ComplaintOperations/ComplaintOperations";
import Analytics from "../pages/admin/Analytics/Analytics";

// Code-split the map page: it pulls in MapLibre GL (~400KB gzipped), which we
// don't want in the initial bundle for citizens who never open it.
const CivicIntelligenceMap = lazy(() =>
  import("../pages/admin/CivicIntelligenceMap/CivicIntelligenceMap")
);

function Placeholder({ title }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Geist, sans-serif",
      }}
    >
      <h1>{title}</h1>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<Login />} />

          {/* Citizen — signed-in portal */}
          <Route
            path="/citizen"
            element={
              <ProtectedRoute requireStaff={false}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/report"
            element={
              <ProtectedRoute requireStaff={false}>
                <ReportIssue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/complaints"
            element={
              <ProtectedRoute requireStaff={false}>
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/profile"
            element={
              <ProtectedRoute requireStaff={false}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/citizen/track" element={<ComplaintTracking />} />
          <Route
            path="/citizen/complaints/:id"
            element={<ComplaintTracking />}
          />

          {/* Admin (staff only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute>
                <ComplaintQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute>
                <ComplaintOperations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Placeholder title="Loading map…" />}>
                  <CivicIntelligenceMap />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route path="/municipal" element={<Placeholder title="Municipal Portal" />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
