import { useHashRoute } from "./useHashRoute.js";
import { MovieCatalogueView, MovieDetailsView } from "../../modules/movies/index.js";
import { MyBookingsView } from "../../modules/user-bookings/index.js";
import { AdminDashboardView } from "../../modules/admin/index.js";
import { AuthPage, ProtectedRoute } from "../../modules/auth/index.js";

export function AppRouter() {
  const {
    route,
    params,
    navigateToMovie,
    navigateToMovies,
    navigateToBookings,
    navigateToAuth,
  } = useHashRoute();

  switch (route) {
    case "movie-details":
      return (
        <MovieDetailsView
          movieId={params.movieId}
          onBack={navigateToMovies}
          onGoToBookings={navigateToBookings}
        />
      );

    case "bookings":
      return (
        <ProtectedRoute onBack={navigateToMovies}>
          <MyBookingsView
            onBack={navigateToMovies}
            onBrowseMovies={navigateToMovies}
          />
        </ProtectedRoute>
      );

    case "admin":
      return (
        <ProtectedRoute requireAdmin onBack={navigateToMovies}>
          <AdminDashboardView onBack={navigateToMovies} />
        </ProtectedRoute>
      );

    case "auth":
      return (
        <AuthPage
          mode={params.mode}
          onAuthenticated={() => navigateToMovies()}
          onModeChange={(nextMode) => navigateToAuth(nextMode)}
          onBack={navigateToMovies}
        />
      );

    case "movies":
    default:
      return <MovieCatalogueView onSelectMovie={navigateToMovie} />;
  }
}
