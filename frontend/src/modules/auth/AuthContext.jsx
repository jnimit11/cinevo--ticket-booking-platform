import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextDef.js";
import { API_BASE_URL } from "../../core/config/constants.js";

const STORAGE_KEY = "cinevo_auth_session";

function getStoredSession() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authSession, setAuthSession] = useState(getStoredSession);
  const [isVerifying, setIsVerifying] = useState(() => Boolean(getStoredSession()?.token));

  // Sync session changes to localStorage
  const updateSession = useCallback((session) => {
    setAuthSession(session);
    try {
      if (session) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist auth session to localStorage:", e);
    }
  }, []);

  // Validate existing token with /api/auth/me on mount
  useEffect(() => {
    const token = authSession?.token;
    if (!token) return;

    let isMounted = true;

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!isMounted) return null;
        if (res.ok) return res.json();
        if (res.status === 401) {
          updateSession(null);
        }
        return null;
      })
      .then((data) => {
        if (!isMounted || !data?.user) return;
        updateSession({ token, user: data.user });
      })
      .catch((err) => {
        console.warn("Could not verify session with backend:", err);
      })
      .finally(() => {
        if (isMounted) setIsVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authSession?.token, updateSession]);

  const login = useCallback(
    async ({ email, password }) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Invalid login credentials");
      }

      const session = { token: data.token, user: data.user };
      updateSession(session);
      return session;
    },
    [updateSession],
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Registration failed");
      }

      const session = { token: data.token, user: data.user };
      updateSession(session);
      return session;
    },
    [updateSession],
  );

  const logout = useCallback(() => {
    updateSession(null);
  }, [updateSession]);

  const value = {
    authSession,
    user: authSession?.user || null,
    token: authSession?.token || null,
    isAuthenticated: Boolean(authSession?.token),
    isAdmin: authSession?.user?.role === "admin",
    isVerifying,
    login,
    register,
    logout,
    setAuthSession: updateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
