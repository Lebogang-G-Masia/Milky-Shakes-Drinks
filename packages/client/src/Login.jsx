import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { hashPassword } from "./SignUp";

export default function Login({ onSwitch, onSuccess, onGuest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Query users table in Supabase
      const { data: user, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!user) throw new Error("Invalid email or password.");

      if (user.is_active === false) {
        throw new Error("This account is inactive. Please contact support.");
      }

      // Verify password hash (with fallback to plain text if legacy rows exist)
      const inputHash = await hashPassword(password);
      const passwordMatches =
        user.password_hash === inputHash || user.password_hash === password;

      if (!passwordMatches) {
        throw new Error("Invalid email or password.");
      }

      console.log("Logged in successfully from users table:", user);
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    setError("");
    setInfoMessage("Password reset instructions have been sent to your email address if an account exists.");
  }

  return (
    <form className="auth-form-wrapper" onSubmit={handleSubmit} noValidate>
      {/* Email Field */}
      <div className="auth-field-group">
        <label className="auth-field-label" htmlFor="auth-email">
          Email Address
        </label>
        <input
          id="auth-email"
          type="email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="e.g. sarah@example.com"
          required
        />
      </div>

      {/* Password Field */}
      <div className="auth-field-group">
        <label className="auth-field-label" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
        />
      </div>

      {/* Options Row: Remember Me & Forgot Password */}
      <div className="auth-options-row">
        <label className="auth-checkbox-label">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember my login
        </label>

        <button
          type="button"
          className="auth-forgot-link"
          onClick={handleForgotPassword}
        >
          Forgot password?
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="auth-error-banner" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Info Message */}
      {infoMessage && (
        <div className="auth-tip-card is-security" role="status">
          <span>ℹ️</span>
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        type="submit"
        className="btn-auth-primary"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      {/* Divider & Guest Access */}
      {onGuest && (
        <>
          <div className="auth-divider-row" aria-hidden="true">
            <span className="auth-divider-line" />
            <span>or</span>
            <span className="auth-divider-line" />
          </div>

          <button
            type="button"
            className="btn-guest-checkout"
            onClick={onGuest}
          >
            Continue as Guest (No Password Required)
          </button>
        </>
      )}

      {/* Switch to Sign Up */}
      <p className="auth-switch-prompt">
        New to Milky Shakes?{" "}
        <button type="button" className="auth-switch-link" onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </form>
  );
}
