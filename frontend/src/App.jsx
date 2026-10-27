import { AuthProvider } from "./modules/auth/index.js";
import { ToastProvider } from "./shared/components/Toast/ToastContext.jsx";
import { Navbar } from "./shared/components/Navbar/Navbar.jsx";
import { Footer } from "./shared/components/Footer/Footer.jsx";
import { AppRouter } from "./core/router/AppRouter.jsx";
import { useHashRoute } from "./core/router/useHashRoute.js";
import "./App.css";

function AppShell() {
  const {
    route,
    navigateToMovies,
    navigateToBookings,
    navigateToAdmin,
    navigateToAuth,
  } = useHashRoute();

  return (
    <div className="cinevo">
      <Navbar
        activeRoute={route}
        onNavigateHome={navigateToMovies}
        onNavigateBookings={navigateToBookings}
        onNavigateAdmin={navigateToAdmin}
        onNavigateAuth={navigateToAuth}
      />
      <main className="cinevo-main-container">
        <AppRouter />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}
