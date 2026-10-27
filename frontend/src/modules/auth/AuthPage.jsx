import { AuthForm } from "./AuthForm.jsx";

export function AuthPage({ mode = "login", onAuthenticated, onModeChange, onBack }) {
  const isRegistration = mode === "register";

  return (
    <main className="auth-page">
      <button
        className="secondary-button back-button"
        type="button"
        onClick={onBack}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "16px" }}
          aria-hidden="true"
        >
          arrow_back
        </span>
        <span>Back to Movies</span>
      </button>

      <div className="auth-page-heading">
        <span className="section-kicker">
          {isRegistration
            ? "YOUR NEXT SCREENING STARTS HERE"
            : "WELCOME BACK TO CINEVO"}
        </span>
        <h1>
          {isRegistration ? "Create your account." : "Sign in to Cinevo."}
        </h1>
        <p>
          {isRegistration
            ? "Create an account to book screenings and manage your reservations."
            : "Sign in to continue to your bookings and saved screenings."}
        </p>
      </div>

      <AuthForm
        key={mode}
        initialMode={mode}
        onAuthenticated={onAuthenticated}
        onModeChange={onModeChange}
      />
    </main>
  );
}
