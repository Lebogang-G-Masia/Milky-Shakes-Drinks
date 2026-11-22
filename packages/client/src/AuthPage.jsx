import React, { useState } from "react";
import Login from "./Login";
import SignUp from "./SignUp";
import "./Auth.css";

export default function AuthPage({
  onAuthSuccess,
  onBackToLanding,
  onContinueAsGuest,
}) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [signupStep, setSignupStep] = useState(1); // 1 | 2
  const isLogin = mode === "login";

  return (
    <div className="auth-page-canvas">
      {/* Top Ambient Melting Caramel Wave */}
      <div className="auth-top-wave-wrap" aria-hidden="true">
        <svg
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="auth-top-wave-svg"
        >
          <path
            d="M0,0 L1440,0 L1440,110 C1200,165 960,85 720,130 C480,175 240,95 0,140 Z"
            fill="#BA724C"
          />
        </svg>
      </div>

      {/* Floating Ambient Cream Scoops */}
      <div className="auth-ambient-scoop auth-scoop-left" aria-hidden="true" />
      <div className="auth-ambient-scoop auth-scoop-right" aria-hidden="true" />

      {/* Back to Home Navigation Button */}
      {onBackToLanding && (
        <div className="auth-back-nav">
          <button
            type="button"
            className="btn-auth-back"
            onClick={onBackToLanding}
          >
            &larr; Back to Milky Shakes
          </button>
        </div>
      )}

      {/* Centered Floating Pedestal Card */}
      <main className="auth-pedestal-card" aria-labelledby="auth-main-title">
        {/* Flowing Cursive Brand Wordmark */}
        <div className="auth-brand-wordmark" aria-label="Milky Shakes Drinks">
          milky
        </div>

        {/* Segmented Glass Pill Switcher */}
        <div className="auth-segmented-switcher" role="tablist" aria-label="Sign in or register">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`auth-tab-btn ${isLogin ? "is-active" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`auth-tab-btn ${!isLogin ? "is-active" : ""}`}
            onClick={() => {
              setMode("signup");
              setSignupStep(1);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Dynamic Header & Subtitle */}
        {isLogin ? (
          <>
            <h1 className="auth-headline" id="auth-main-title">
              Welcome Back, Sipper!
            </h1>
            <p className="auth-subtitle">
              Sign in to customize your ice-cold pack, track orders, and sip fresh.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-headline" id="auth-main-title">
              {signupStep === 1 ? "Join the Sippers Club" : "Set Up Security"}
            </h1>
            <p className="auth-subtitle">
              {signupStep === 1
                ? "Step 1 of 2 — Tell us who's enjoying the shakes!"
                : "Step 2 of 2 — Create your secure login credentials."}
            </p>
          </>
        )}

        {/* Form Panels */}
        {isLogin ? (
          <Login
            onSwitch={() => {
              setMode("signup");
              setSignupStep(1);
            }}
            onSuccess={(user) => onAuthSuccess && onAuthSuccess(user)}
            onGuest={onContinueAsGuest}
          />
        ) : (
          <SignUp
            onSwitch={() => setMode("login")}
            onSuccess={(user) => onAuthSuccess && onAuthSuccess(user)}
            onStepChange={(step) => setSignupStep(step)}
          />
        )}
      </main>
    </div>
  );
}
