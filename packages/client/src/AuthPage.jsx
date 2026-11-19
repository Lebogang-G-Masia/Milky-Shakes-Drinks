import { useState } from "react";
import Login from "./Login";
import SignUp from "./SignUp";
import "./Auth.css";

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const isLogin = mode === "login";

  return (
    <div className="auth-card">
      <div className={`panel ${isLogin ? "active" : "exit-left"}`} inert={!isLogin ? "" : undefined}>
        <Login
          onSwitch={() => setMode("signup")}
          onSuccess={(user) => onAuthSuccess && onAuthSuccess(user)}
        />
      </div>

      <div className={`panel ${!isLogin ? "active" : "exit-right"}`} inert={isLogin ? "" : undefined}>
        <SignUp
          onSwitch={() => setMode("login")}
          onSuccess={(user) => onAuthSuccess && onAuthSuccess(user)}
        />
      </div>
    </div>
  );
}
