import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          fontFamily: "Geist, sans-serif",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--primary-container)",
            }}
          >
            404
          </div>
          <h1 style={{ margin: "8px 0 10px", fontSize: 24, fontWeight: 650 }}>
            Page not found
          </h1>
          <p style={{ margin: "0 0 24px", color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
            The page you're looking for doesn't exist or may have moved.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="cp-button cp-button-primary cp-button-small" to="/">
              Back to home
            </Link>
            <Link className="cp-button cp-button-secondary cp-button-small" to="/citizen">
              Citizen portal
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
