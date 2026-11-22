import { useState } from "react";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";
import ManagementDashboard from "./ManagementDashboard";
import { USER_ROLES } from "@milky-shakes/shared";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("order"); // "order" | "management"

  if (currentUser) {
    if (activeView === "management") {
      return (
        <ManagementDashboard
          currentUser={currentUser}
          onNavigateToOrder={() => setActiveView("order")}
          onSignOut={() => {
            setCurrentUser(null);
            setActiveView("order");
          }}
        />
      );
    }

    return (
      <OrderPlacement
        currentUser={currentUser}
        onNavigateToManagement={() => setActiveView("management")}
        onSignOut={() => setCurrentUser(null)}
      />
    );
  }

  return (
    <AuthPage
      onAuthSuccess={(user) => {
        setCurrentUser(user);
        if (user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.STAFF) {
          setActiveView("management");
        } else {
          setActiveView("order");
        }
      }}
    />
  );
}
