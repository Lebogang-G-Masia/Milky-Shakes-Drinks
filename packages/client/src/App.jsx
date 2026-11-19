import { useState } from "react";
import AuthPage from "./AuthPage";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  if (currentUser) {
    return (
      <div
        className="auth-card"
        style={{
          maxWidth: "460px",
          margin: "3rem auto",
          padding: "2.5rem",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            background: "#ffe4e6",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "28px",
          }}
        >
          🍦
        </div>
        <h1 style={{ fontSize: "1.75rem", color: "#e11d48", margin: "0 0 0.5rem" }}>
          Milky Shakes Drinks
        </h1>
        <h2 style={{ fontSize: "1.25rem", color: "#1e293b", margin: "0 0 1rem" }}>
          Welcome back!
        </h2>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "left",
            fontSize: "0.95rem",
            color: "#475569",
          }}
        >
          <div style={{ marginBottom: "0.25rem" }}>
            <strong>Account:</strong> {currentUser.email}
          </div>
          <div>
            <strong>User ID:</strong> {currentUser.id}
          </div>
        </div>

        <button
          onClick={() => setCurrentUser(null)}
          style={{
            width: "100%",
            padding: "0.85rem",
            background: "#e11d48",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
}
