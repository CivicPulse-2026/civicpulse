import { useEffect, useState } from "react";
import { publicService } from "../lib/services";

export default function Footer() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    publicService
      .stats()
      .then((s) => active && setStats(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const efficiency =
    stats?.sla_compliance != null ? `${stats.sla_compliance}%` : "live";

  return (
    <footer className="cp-footer">
      <div className="cp-container cp-footer-inner">
        <div className="cp-footer-top">
          <div>
            <div className="cp-footer-brand">CivicPulse</div>
            <p>From Citizen Complaints to Civic Action</p>
          </div>
          <div className="cp-footer-status">
            <span className="cp-status-dot cp-status-dot-green" />
            <span>SLA Compliance • {efficiency} on-time resolution</span>
          </div>
        </div>

        <div className="cp-footer-bottom">
          <div className="cp-footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#contact">Contact</a>
            <a href="/municipal">Municipal Portal</a>
          </div>
          <div>© 2026 CivicPulse Civic Technology Systems. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
