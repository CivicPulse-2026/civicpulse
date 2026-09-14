import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/public/LandingPage";
import ReportIssue from "../pages/citizen/ReportIssue/ReportIssue";
import ComplaintTracking from "../pages/citizen/ComplaintTracking/ComplaintTracking";

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
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/citizen/report"
          element={<ReportIssue />}
        />

        <Route
          path="/citizen/complaints/:id"
          element={<ComplaintTracking />}
        />

        <Route
          path="/auth/login"
          element={<Placeholder title="Login" />}
        />

        <Route
          path="/municipal"
          element={<Placeholder title="Municipal Portal" />}
        />

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}