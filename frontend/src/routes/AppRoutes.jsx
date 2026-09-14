import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/public/LandingPage";
import ReportIssue from "../pages/citizen/ReportIssue/ReportIssue";
import ComplaintTracking from "../pages/citizen/ComplaintTracking/ComplaintTracking";
import AdminDashboard from "../pages/admin/AdminDashboard/AdminDashboard";
import ComplaintQueue from "../pages/admin/ComplaintQueue/ComplaintQueue";
import ComplaintOperations from "../pages/admin/ComplaintOperations/ComplaintOperations";
import CivicIntelligenceMap
  from "../pages/admin/CivicIntelligenceMap/CivicIntelligenceMap";
import Analytics from "../pages/admin/Analytics/Analytics";

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
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Citizen */}
        <Route path="/citizen/report" element={<ReportIssue />} />
        <Route
          path="/citizen/complaints/:id"
          element={<ComplaintTracking />}
        />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route
        path="/admin/complaints"
        element={<ComplaintQueue />}
        />

        <Route
        path="/admin/complaints/:id"
        element={<ComplaintOperations />}
        />

        <Route
        path="/admin/map"
        element={<CivicIntelligenceMap />}
        />

        <Route
        path="/admin/analytics"
        element={<Analytics />}
        />

        {/* Temporary */}
        <Route
          path="/auth/login"
          element={<Placeholder title="Login" />}
        />

        <Route
          path="/municipal"
          element={<Placeholder title="Municipal Portal" />}
        />

        {/* Fallback */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}