import { useState, useEffect, useCallback } from "react";

export function parseHash() {
  const hash = window.location.hash || "#movies";

  if (hash === "#bookings") {
    return { route: "bookings", params: {} };
  }

  if (hash === "#admin") {
    return { route: "admin", params: {} };
  }

  if (hash === "#signin") {
    return { route: "auth", params: { mode: "login" } };
  }

  if (hash === "#register") {
    return { route: "auth", params: { mode: "register" } };
  }

  const movieMatch = hash.match(/^#movie\/([^/?#]+)/);
  if (movieMatch) {
    return {
      route: "movie-details",
      params: { movieId: decodeURIComponent(movieMatch[1]) },
    };
  }

  return { route: "movies", params: {} };
}

export function useHashRoute() {
  const [currentRoute, setCurrentRoute] = useState(parseHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(parseHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const navigate = useCallback((hash) => {
    if (!hash.startsWith("#")) hash = `#${hash}`;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setCurrentRoute(parseHash());
    }
  }, []);

  const navigateToMovie = useCallback((movieId) => {
    window.location.hash = `#movie/${encodeURIComponent(movieId)}`;
    window.scrollTo(0, 0);
  }, []);

  const navigateToMovies = useCallback(() => {
    window.location.hash = "#movies";
  }, []);

  const navigateToBookings = useCallback(() => {
    window.location.hash = "#bookings";
    window.scrollTo(0, 0);
  }, []);

  const navigateToAdmin = useCallback(() => {
    window.location.hash = "#admin";
    window.scrollTo(0, 0);
  }, []);

  const navigateToAuth = useCallback((mode = "login") => {
    window.location.hash = mode === "register" ? "#register" : "#signin";
    window.scrollTo(0, 0);
  }, []);

  return {
    ...currentRoute,
    navigate,
    navigateToMovie,
    navigateToMovies,
    navigateToBookings,
    navigateToAdmin,
    navigateToAuth,
  };
}
