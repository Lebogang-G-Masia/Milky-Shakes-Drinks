import { useState } from "react";
import Login from "./Login";
import SignUp from "./SignUp";
import "./Auth.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const isLogin = mode === "login";

  return (
    <div className="auth-card">
      <div className={`panel ${isLogin ? "active" : "exit-left"}`} inert={!isLogin}>
        <Login onSwitch={() => setMode("signup")} />
      </div>

      <div className={`panel ${!isLogin ? "active" : "exit-right"}`} inert={isLogin}>
        <SignUp onSwitch={() => setMode("login")} />
      </div>
    </div>
  );
}