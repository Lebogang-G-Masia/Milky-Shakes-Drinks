import { useState } from "react";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";
import ManagementDashboard from "./ManagementDashboard";
import { USER_ROLES } from "@milky-shakes/shared";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("landing"); // "landing" | "order" | "management" | "auth"

  // Logged-in experience
  if (currentUser) {
    if (activeView === "management") {
      return (
        <ManagementDashboard
          currentUser={currentUser}
          onNavigateToOrder={() => setActiveView("order")}
          onSignOut={() => {
            setCurrentUser(null);
            setActiveView("landing");
          }}
        />
      );
    }

    if (activeView === "landing") {
      return (
        <LandingPage
          onStartOrder={() => setActiveView("order")}
          onOpenAuth={() => setActiveView(currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.STAFF ? "management" : "order")}
        />
      );
    }

    return (
      <OrderPlacement
        currentUser={currentUser}
        onNavigateToManagement={() => setActiveView("management")}
        onSignOut={() => {
          setCurrentUser(null);
          setActiveView("landing");
        }}
      />
    );
  }

  // Guest / Unauthenticated experience
  if (activeView === "landing") {
    return (
      <LandingPage
        onStartOrder={() => setActiveView("order")}
        onOpenAuth={() => setActiveView("auth")}
      />
    );
  }

  if (activeView === "order") {
    return (
      <OrderPlacement
        currentUser={null}
        onNavigateToManagement={() => setActiveView("auth")}
        onSignOut={() => setActiveView("landing")}
      />
    );
  }

  return (
    <AuthPage
      onAuthSuccess={(user) => {
        setCurrentUser(user);
        // Default managers/staff directly to management view if desired, or let them navigate
        if (user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.STAFF) {
          setActiveView("management");
        } else {
          setActiveView("order");
        }
      }}
    />
  );
}
