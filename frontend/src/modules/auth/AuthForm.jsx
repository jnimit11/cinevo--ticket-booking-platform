import { useState, useId } from "react";
import { useAuth } from "./useAuth.js";

export function AuthForm({
  onAuthenticated,
  message = "",
  initialMode = "login",
  onModeChange,
}) {
  const [authMode, setAuthMode] = useState(initialMode);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authStatus, setAuthStatus] = useState("idle");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const idPrefix = useId();

  const { login, register } = useAuth();

  async function submitAuthentication(event) {
    event.preventDefault();
    setAuthError("");

    if (authMode === "register" && authForm.name.trim().length < 2) {
      setAuthError("Name must contain at least 2 non-space characters.");
      return;
    }

    setAuthStatus("loading");

    try {
      let session;
      if (authMode === "register") {
        session = await register({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        });
      } else {
        session = await login({
          email: authForm.email,
          password: authForm.password,
        });
      }

      onAuthenticated?.(session);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthStatus("idle");
    } catch (error) {
      setAuthError(error.message || "Unable to authenticate.");
      setAuthStatus("error");
    }
  }

  return (
    <form className="auth-panel" onSubmit={submitAuthentication}>
      <div className="auth-ambient-glow" aria-hidden="true" />
      <div className="auth-panel-heading">
        <div>
          <span className="section-kicker">CONCIERGE ACCESS</span>
          <h3>
            {authMode === "login"
              ? "Sign in to continue"
              : "Create your Cinevo account"}
          </h3>
        </div>
        <button
          className="auth-mode-toggle"
          type="button"
          onClick={() => {
            const nextMode = authMode === "login" ? "register" : "login";
            setAuthMode(nextMode);
            onModeChange?.(nextMode);
            setAuthError("");
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "15px" }}
            aria-hidden="true"
          >
            {authMode === "login" ? "person_add" : "login"}
          </span>
          <span>
            {authMode === "login" ? "Create account" : "I have an account"}
          </span>
        </button>
      </div>

      {authMode === "register" && (
        <label className="auth-field">
          <span>Full Name</span>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            autoComplete="name"
            minLength="2"
            maxLength="100"
            required
            placeholder="e.g. Eleanor Vance"
            value={authForm.name}
            onChange={(event) =>
              setAuthForm({ ...authForm, name: event.target.value })
            }
          />
        </label>
      )}

      <label className="auth-field">
        <span>Email Address</span>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength="255"
          required
          placeholder="name@cinevo.luxury"
          value={authForm.email}
          onChange={(event) =>
            setAuthForm({ ...authForm, email: event.target.value })
          }
        />
      </label>

      <div className="auth-field">
        <label htmlFor={`${idPrefix}-password`}>
          <span>Password</span>
        </label>
        <div className="password-input-row">
          <input
            id={`${idPrefix}-password`}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={
              authMode === "login" ? "current-password" : "new-password"
            }
            minLength={authMode === "register" ? 8 : 1}
            maxLength="72"
            required
            placeholder="••••••••"
            value={authForm.password}
            onChange={(event) =>
              setAuthForm({ ...authForm, password: event.target.value })
            }
          />
          <button
            className="password-visibility-button"
            type="button"
            aria-controls={`${idPrefix}-password`}
            aria-pressed={showPassword}
            title={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
              aria-hidden="true"
            >
              {showPassword ? "visibility_off" : "visibility"}
            </span>
            <span className="visually-hidden">
              {showPassword ? "Hide" : "Show"} password
            </span>
          </button>
        </div>
        {authMode === "register" && (
          <small className="auth-field-hint">Use 8–72 characters.</small>
        )}
      </div>

      {authError && (
        <p className="auth-error" role="alert">
          {authError}
        </p>
      )}
      {message && (
        <p className="auth-error" role="alert">
          {message}
        </p>
      )}

      <button
        className="primary-button auth-submit-button"
        type="submit"
        disabled={authStatus === "loading"}
      >
        {authStatus === "loading" ? (
          <>
            <span
              className="material-symbols-outlined spin-icon"
              aria-hidden="true"
            >
              sync
            </span>
            <span>Please wait...</span>
          </>
        ) : (
          <>
            <span>{authMode === "login" ? "Sign In" : "Create Account"}</span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </>
        )}
      </button>
    </form>
  );
}
