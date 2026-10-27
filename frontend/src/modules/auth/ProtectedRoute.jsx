import { useAuth } from "./useAuth.js";
import { AuthForm } from "./AuthForm.jsx";

export function ProtectedRoute({ children, requireAdmin = false, onBack }) {
  const { isAuthenticated, isAdmin, isVerifying } = useAuth();

  if (isVerifying) {
    return (
      <div className="status-panel">
        <span className="material-symbols-outlined spin-icon" aria-hidden="true">
          sync
        </span>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="auth-page">
        {onBack && (
          <button className="secondary-button back-button" type="button" onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
              arrow_back
            </span>
            <span>Return to movies</span>
          </button>
        )}
        <div className="auth-page-heading">
          <span className="section-kicker">AUTHENTICATION REQUIRED</span>
          <h1>Sign in to access this page</h1>
          <p>You must be signed in to view this section.</p>
        </div>
        <AuthForm />
      </main>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="status-panel error-panel">
        <span className="material-symbols-outlined" aria-hidden="true">
          lock
        </span>
        <h2>Admin Access Required</h2>
        <p>Your current account does not have permission to view the concierge dashboard.</p>
        {onBack && (
          <button className="primary-button" type="button" onClick={onBack} style={{ marginTop: "1rem" }}>
            Return to Movies
          </button>
        )}
      </div>
    );
  }

  return children;
}
