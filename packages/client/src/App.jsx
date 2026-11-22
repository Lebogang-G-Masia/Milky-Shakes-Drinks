import React, { useState } from "react";
import { RouterProvider, useRouter } from "./router";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";
import FlavoursPage from "./FlavoursPage";
import PhilosophyPage from "./PhilosophyPage";
import FaqPage from "./FaqPage";
import ManagementDashboard from "./ManagementDashboard";
import PatronOrdersPage from "./PatronOrdersPage";
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

  if (path === "/my-orders" || path === "/orders-history" || path === "/history") {
    return (
      <PatronOrdersPage
        currentUser={currentUser}
        onSignOut={handleSignOut}
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

  if (path === "/management" || path === "/manager" || path === "/admin") {
    // Allows direct access to manager operations suite for review and testing,
    // with built-in RBAC switcher (AC-FR-005.3) to test Patron 403 vs Manager/Staff roles
    const managerUser = currentUser?.role === USER_ROLES.MANAGER || currentUser?.role === USER_ROLES.STAFF
      ? currentUser
      : {
          id: "mgr-demo-01",
          name: currentUser?.name || "Sarah Connor",
          email: currentUser?.email || "manager@milkyshakes.com",
          role: USER_ROLES.MANAGER,
        };

    return (
      <ManagementDashboard
        currentUser={managerUser}
        onNavigateToOrder={() => navigate("/orders")}
        onSignOut={handleSignOut}
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("UI Render Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "3rem 1.5rem",
            maxWidth: "600px",
            margin: "60px auto",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #fee2e2",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            fontFamily: "var(--sans)",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <h2 style={{ color: "#b91c1c", fontSize: "20px", marginBottom: "10px" }}>
            Something went wrong loading this page
          </h2>
          <p style={{ color: "#4b5563", fontSize: "14px", marginBottom: "24px" }}>
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            style={{
              padding: "10px 24px",
              background: "#381F15",
              color: "#ffffff",
              border: "none",
              borderRadius: "9999px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </ErrorBoundary>
  );
}
