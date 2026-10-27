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
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <a
          className="brand"
          href="#home"
          aria-label="Cinevo home"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          <span className="brand-text">CINEVO</span>
          <span className="brand-dot" />
        </a>
      </div>

      {/* Desktop Navigation Links */}
      <nav className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`} aria-label="Main Navigation">
        <a
          className={activeRoute === "movies" ? "nav-active" : ""}
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            onNavigateHome();
          }}
        >
          Home
        </a>
        <a
          href="#movies"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            onNavigateHome();
            requestAnimationFrame(() => {
              document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" });
            });
          }}
        >
          Explore Movies
        </a>
        {isAuthenticated && (
          <a
            className={activeRoute === "bookings" ? "nav-active" : ""}
            href="#bookings"
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
            className={activeRoute === "admin" ? "nav-active" : ""}
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigateAdmin();
            }}
          >
            Admin Dashboard
          </a>
        )}
      </nav>

      {/* Desktop Nav Actions */}
      <div className="nav-actions">
        <button
          className="quick-search-trigger"
          type="button"
          onClick={() => {
            document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" });
            const input = document.querySelector(".search-box input");
            if (input) input.focus();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            search
          </span>
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>

        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="user-badge" title={user?.email || "Logged in"}>
              <span className="user-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
              <span className="user-name">{user?.name || "Account"}</span>
            </div>
            <button className="signin-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="signin-button"
              type="button"
              onClick={() => onNavigateAuth("login")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                person
              </span>
              <span>Sign in</span>
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => onNavigateAuth("register")}
            >
              <span>Register</span>
            </button>
          </div>
        )}

        <button
          className="mobile-nav-toggle"
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>
    </header>
  );
}
