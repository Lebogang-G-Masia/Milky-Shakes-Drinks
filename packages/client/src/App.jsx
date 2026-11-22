import { useState } from "react";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";
import ManagementDashboard from "./ManagementDashboard";
import { USER_ROLES } from "@milky-shakes/shared";

const AUTH_STORAGE_KEY = "milky_auth_user";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to load saved session:", e);
      return null;
    }
  });
  const [activeView, setActiveView] = useState("landing"); // "landing" | "order" | "management" | "auth"

  const handleSignOut = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear saved session:", e);
    }
    setCurrentUser(null);
    setActiveView("landing");
  };

  const handleAuthSuccess = (user) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn("Failed to save auth session:", e);
    }
    setCurrentUser(user);
    if (user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.STAFF) {
      setActiveView("management");
    } else {
      setActiveView("order");
    }
  };

  // Logged-in experience
  if (currentUser) {
    if (activeView === "management") {
      return (
        <ManagementDashboard
          currentUser={currentUser}
          onNavigateToOrder={() => setActiveView("order")}
          onSignOut={handleSignOut}
        />
      );
    }

    if (activeView === "landing") {
      return (
        <LandingPage
          onStartOrder={() => setActiveView("order")}
          onOpenAuth={() =>
            setActiveView(
              currentUser.role === USER_ROLES.MANAGER ||
                currentUser.role === USER_ROLES.STAFF
                ? "management"
                : "order"
            )
          }
        />
      );
    }

    return (
      <OrderPlacement
        currentUser={currentUser}
        onBackToLanding={(sectionId) => {
          setActiveView("landing");
          if (sectionId && sectionId !== "Packs") {
            setTimeout(() => {
              const el = document.getElementById(sectionId.toLowerCase());
              el?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  // Unauthenticated experience: Ordering requires an active account!
  if (activeView === "landing") {
    return (
      <LandingPage
        onStartOrder={() => setActiveView("auth")}
        onOpenAuth={() => setActiveView("auth")}
      />
    );
  }

  // Any other view for unauthenticated users redirects to AuthPage
  return (
    <AuthPage
      onAuthSuccess={handleAuthSuccess}
      onBackToLanding={() => setActiveView("landing")}
    />
  );
}
