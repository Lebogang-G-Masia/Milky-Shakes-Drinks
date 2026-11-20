import { useState } from "react";
import AuthPage from "./AuthPage";
import OrderPlacement from "./OrderPlacement";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  if (currentUser) {
    return (
      <OrderPlacement
        currentUser={currentUser}
        onSignOut={() => setCurrentUser(null)}
      />
    );
  }

  return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
}
