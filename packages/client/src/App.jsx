import React, { useState } from "react";
import { RouterProvider, useRouter } from "./router";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";
import FlavoursPage from "./FlavoursPage";
import PhilosophyPage from "./PhilosophyPage";
import FaqPage from "./FaqPage";
import ManagementDashboard from "./ManagementDashboard";
import { USER_ROLES } from "@milky-shakes/shared";

const AUTH_STORAGE_KEY = "milky_auth_user";

function AppContent() {
  const { path, navigate } = useRouter();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to load saved session:", e);
      return null;
    }
  });

  const handleSignOut = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear saved session:", e);
    }
    setCurrentUser(null);
    navigate("/");
  };

  const handleAuthSuccess = (user, returnUrl) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn("Failed to save auth session:", e);
    }
    setCurrentUser(user);
    if (returnUrl) {
      navigate(returnUrl);
    } else if (user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.STAFF) {
      navigate("/management");
    } else {
      navigate("/orders");
    }
  };

  // Route matching
  if (path === "/orders" || path === "/order") {
    return (
      <OrderPlacement
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onBackToLanding={() => navigate("/")}
        onAuthSuccess={(user) => {
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          } catch (e) {
            console.warn("Failed to save auth session:", e);
          }
          setCurrentUser(user);
        }}
      />
    );
  }

  if (path === "/flavours" || path === "/flavors") {
    return (
      <FlavoursPage
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
    );
  }

  if (path === "/philosophy" || path === "/about" || path === "/story") {
    return (
      <PhilosophyPage
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
    );
  }

  if (path === "/faq") {
    return (
      <FaqPage
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
    );
  }

  if (path === "/auth" || path === "/login" || path === "/signup") {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onBackToLanding={() => navigate("/")}
      />
    );
  }

  if (path === "/management") {
    if (currentUser?.role === USER_ROLES.MANAGER || currentUser?.role === USER_ROLES.STAFF) {
      return (
        <ManagementDashboard
          currentUser={currentUser}
          onNavigateToOrder={() => navigate("/orders")}
          onSignOut={handleSignOut}
        />
      );
    }
    // If unauthenticated or not manager/staff, route to auth with returnUrl
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onBackToLanding={() => navigate("/")}
      />
    );
  }

  // Default: Landing Page / Home (route "/")
  return (
    <LandingPage
      currentUser={currentUser}
      onStartOrder={() => navigate("/orders")}
      onOpenAuth={() => {
        if (currentUser?.role === USER_ROLES.MANAGER || currentUser?.role === USER_ROLES.STAFF) {
          navigate("/management");
        } else if (currentUser) {
          navigate("/orders");
        } else {
          navigate("/auth");
        }
      }}
      onSignOut={handleSignOut}
    />
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
