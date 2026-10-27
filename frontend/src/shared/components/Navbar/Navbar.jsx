import { useState } from "react";
import { useAuth } from "../../../modules/auth/index.js";

export function Navbar({
  activeRoute,
  onNavigateHome,
  onNavigateBookings,
  onNavigateAdmin,
  onNavigateAuth,
}) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <a
        href="#movies"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          onNavigateHome();
        }}
      >
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-text">CINEVO</span>
      </a>

      {/* Desktop Navigation Links */}
      <nav className="nav-links" aria-label="Main Navigation">
        <a
          href="#movies"
          className={activeRoute === "movies" ? "nav-active" : ""}
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          Screenings
        </a>

        {isAuthenticated && (
          <a
            href="#bookings"
            className={activeRoute === "bookings" ? "nav-active" : ""}
            onClick={(e) => {
              e.preventDefault();
              onNavigateBookings();
            }}
          >
            My Bookings
          </a>
        )}

        {isAdmin && (
          <a
            href="#admin"
            className={activeRoute === "admin" ? "nav-active" : ""}
            onClick={(e) => {
              e.preventDefault();
              onNavigateAdmin();
            }}
          >
            Concierge Admin
          </a>
        )}
      </nav>

      {/* Desktop Nav Actions */}
      <div className="nav-actions">
        {isAuthenticated ? (
          <div className="user-badge">
            <span className="user-avatar" aria-hidden="true">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </span>
            <span className="user-name">{user?.name || "Member"}</span>
            <button
              type="button"
              className="ghost-button"
              style={{ fontSize: "11px", padding: "4px 8px" }}
              onClick={logout}
              title="Sign out of Cinevo"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="secondary-button"
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={() => onNavigateAuth("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={() => onNavigateAuth("register")}
            >
              Register
            </button>
          </div>
        )}

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <a
            href="#movies"
            className="mobile-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigateHome();
            }}
          >
            Screenings
          </a>
          {isAuthenticated && (
            <a
              href="#bookings"
              className="mobile-nav-item"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                onNavigateBookings();
              }}
            >
              My Bookings
            </a>
          )}
          {isAdmin && (
            <a
              href="#admin"
              className="mobile-nav-item"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                onNavigateAdmin();
              }}
            >
              Concierge Admin
            </a>
          )}
          {!isAuthenticated && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateAuth("login");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateAuth("register");
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
