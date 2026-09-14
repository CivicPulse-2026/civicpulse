export default function Footer() {
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
            <span>Guaranteed SLA Response • 99.8% Resolution Efficiency</span>
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
