import React, { useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Computes a SHA-256 hex string for the password using the browser's Web Crypto API.
 */
export async function hashPassword(plainText) {
  const msgUint8 = new TextEncoder().encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function SignUp({ onSwitch, onSuccess, onStepChange }) {
  // Stepper state: 1 (Your Details) | 2 (Security)
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [role, setRole] = useState("PATRON");

  // Step 2 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Update parent step tracker if provided
  function changeStep(newStep) {
    setStep(newStep);
    setError("");
    if (onStepChange) {
      onStepChange(newStep);
    }
  }

  // Handle Step 1 Validation & Proceed
  function handleProceedToStep2(e) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length < 7) {
      setError("Please enter a valid mobile number (e.g. +27 82 123 4567).");
      return;
    }

    changeStep(2);
  }

  // Handle Step 2 Final Submission to Supabase
  async function handleFinalSubmit(e) {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address (e.g. sarah@example.com).");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match. Please verify your password.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check if user already exists in users table
      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }

      // 2. Hash password with SHA-256
      const hashedPassword = await hashPassword(password);

      // 3. Insert new user into users table
      const { data, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            first_name: firstName.trim(),
            email: normalizedEmail,
            mobile_number: mobileNumber.trim(),
            password_hash: hashedPassword,
            role: role || "PATRON",
            completed_orders_count: 0,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "42501") {
          throw new Error(
            "Row-Level Security: Please run the INSERT policy in Supabase SQL editor to allow sign-ups."
          );
        }
        throw insertError;
      }

      console.log("Account created successfully in users table:", data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-wrapper">
      {/* Multi-Step Micro-Stepper Indicator Header */}
      <div className="auth-stepper-track" aria-label="Registration Progress">
        <div
          className={`stepper-pill ${step === 1 ? "is-active" : "is-completed"}`}
        >
          <span>{step > 1 ? "✓" : "●"}</span>
          <span>1. Your Details</span>
        </div>

        <div
          className={`stepper-connector ${step > 1 ? "is-active" : ""}`}
          aria-hidden="true"
        />

        <div
          className={`stepper-pill ${step === 2 ? "is-active" : "is-upcoming"}`}
        >
          <span>{step === 2 ? "●" : "○"}</span>
          <span>2. Security</span>
        </div>
      </div>

      {/* STEP 1: Personal Details */}
      {step === 1 && (
        <form onSubmit={handleProceedToStep2} className="auth-form-wrapper" noValidate>
          {/* First Name */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-firstname">
              First Name
            </label>
            <input
              id="auth-firstname"
              type="text"
              className="auth-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="e.g. Sarah"
              required
            />
          </div>

          {/* Mobile Phone Number */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-mobile">
              Mobile Phone Number
            </label>
            <input
              id="auth-mobile"
              type="tel"
              className="auth-input"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              autoComplete="tel"
              placeholder="+27 82 555 1234"
              required
            />
          </div>

          {/* Account Role Selector */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-role">
              Account Type
            </label>
            <select
              id="auth-role"
              className="auth-input auth-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="PATRON">Sipping Patron (Customer)</option>
              <option value="STAFF">Store Staff</option>
              <option value="MANAGER">Store Manager</option>
            </select>
          </div>

          {/* Delivery Tracking Tip Card */}
          <div className="auth-tip-card">
            <span>📱</span>
            <span>Used for live delivery tracking and SMS driver dispatch updates.</span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1 Next Button */}
          <button type="submit" className="btn-auth-primary btn-auth-caramel">
            Continue to Security &rarr;
          </button>

          {/* Switch to Sign In */}
          <p className="auth-switch-prompt">
            Already a member?{" "}
            <button type="button" className="auth-switch-link" onClick={onSwitch}>
              Sign in to your account
            </button>
          </p>
        </form>
      )}

      {/* STEP 2: Login Credentials & Security */}
      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="auth-form-wrapper" noValidate>
          {/* Email Address */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-signup-email">
              Email Address
            </label>
            <input
              id="auth-signup-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="e.g. sarah@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-signup-password">
              Password (Min 8 Characters)
            </label>
            <input
              id="auth-signup-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••••••"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-signup-confirm">
              Confirm Password
            </label>
            <input
              id="auth-signup-confirm"
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••••••"
              required
            />
          </div>

          {/* Security Assurance Card */}
          <div className="auth-tip-card is-security">
            <span>🔒</span>
            <span>Protected with SHA-256 encryption &amp; Supabase Auth.</span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Dual Action Row: Back Button & Final Submit */}
          <div className="auth-dual-action-row">
            <button
              type="button"
              className="btn-auth-secondary"
              onClick={() => changeStep(1)}
              disabled={loading}
            >
              &larr; Back
            </button>

            <button
              type="submit"
              className="btn-auth-primary"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Complete & Sip In  ✓"}
            </button>
          </div>

          {/* Switch to Sign In */}
          <p className="auth-switch-prompt">
            Already a member?{" "}
            <button type="button" className="auth-switch-link" onClick={onSwitch}>
              Sign in to your account
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
