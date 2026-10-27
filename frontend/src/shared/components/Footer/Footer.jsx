export function Footer() {
  return (
    <footer className="luxury-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <span className="brand-text">CINEVO</span>
            <p>
              The premier destination for elevated cinema. Experience world-class acoustics,
              plush bespoke seating, and handcrafted culinary accompaniments.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Curated Venues</h4>
            <ul className="footer-list">
              <li>
                <strong>Grand Palais</strong>
                <small>Ocean Avenue, Mumbai</small>
              </li>
              <li>
                <strong>Royal Horizon</strong>
                <small>Embassy Blvd, Bengaluru</small>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Experience</h4>
            <ul className="footer-list">
              <li>Dolby Atmos Laser Sound</li>
              <li>VIP Leather Recliner Pods</li>
              <li>In-Auditorium Sommelier &amp; Dining</li>
              <li>Private Salon Screenings</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>&copy; {new Date().getFullYear()} Cinevo Luxury Cinema. All rights reserved.</p>
          <div className="footer-bottom-links">
            <span>Terms of Concierge</span>
            <span>Privacy Policy</span>
            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
