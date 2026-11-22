import React, { useState, useMemo } from "react";
import Login from "./Login";
import SignUp from "./SignUp";
import { useRouter } from "./router";
import { loadOrderDraft } from "./orderDraft";
import "./Auth.css";

export default function AuthPage({
  onAuthSuccess,
  onBackToLanding,
  hideBackToLanding = false,
}) {
  const { navigate, params } = useRouter();
  const [mode, setMode] = useState(() => (params?.mode === "signup" ? "signup" : "login")); // "login" | "signup"
  const [signupStep, setSignupStep] = useState(1); // 1 | 2
  const isLogin = mode === "login";

  const orderDraft = useMemo(() => loadOrderDraft(), []);
  const filledCount = orderDraft?.drinks?.filter((d) => d && d.flavourId).length || 0;

  const handleBack = () => {
    if (params?.returnUrl) {
      navigate(params.returnUrl);
    } else if (onBackToLanding) {
      onBackToLanding();
    } else {
      navigate("/");
    }
  };

  const handleSuccess = (user) => {
    if (onAuthSuccess) {
      onAuthSuccess(user, params?.returnUrl);
    }
  };

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

      {/* Back Navigation Button */}
      {(!hideBackToLanding || params?.returnUrl) && (
        <div className="auth-back-nav">
          <button
            type="button"
            className="btn-auth-back"
            onClick={handleBack}
          >
            &larr; {params?.returnUrl ? "Back to Previous Page" : "Back to Milky Shakes"}
          </button>
        </div>
      )}

      {/* Centered Floating Pedestal Card */}
      <main className="auth-pedestal-card" aria-labelledby="auth-main-title">
        {/* Flowing Cursive Brand Wordmark */}
        <div
          className="auth-brand-wordmark"
          onClick={() => {
            if (hideBackToLanding) return;
            navigate("/");
          }}
          role="button"
          tabIndex={0}
          style={{ cursor: hideBackToLanding ? "default" : "pointer" }}
          aria-label="Milky Shakes Drinks"
        >
          milky
        </div>

        {/* Order Saved Banner */}
        {filledCount > 0 && (
          <div
            style={{
              background: "#E8F8F0",
              border: "1.5px solid #BBE8D0",
              borderRadius: "14px",
              padding: "10px 16px",
              marginBottom: "18px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#175234",
            }}
          >
            Your {orderDraft.packSize}-Pack Box is saved ({filledCount} Shakes)! Sign in to finalize checkout.
          </div>
        )}

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
            onSuccess={handleSuccess}
          />
        ) : (
          <SignUp
            onSwitch={() => setMode("login")}
            onSuccess={handleSuccess}
            onStepChange={(step) => setSignupStep(step)}
          />
        )}
      </main>
    </div>
  );
}
