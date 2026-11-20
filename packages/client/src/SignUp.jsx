import { useState } from "react";
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

export default function SignUp({ onSwitch, onSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [role, setRole] = useState("PATRON");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !email.trim() || !mobileNumber.trim() || !password || !confirm) {
      setError("Please fill in every field.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    if (mobileNumber.trim().length < 5) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
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
        throw new Error("An account with this email already exists.");
      }

      // 2. Hash password
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
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Create account</h1>

      <label htmlFor="first-name">First Name</label>
      <input
        id="first-name"
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        autoComplete="given-name"
        placeholder="e.g. Alex"
      />

      <label htmlFor="signup-email">Email</label>
      <input
        id="signup-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="e.g. alex@example.com"
      />

      <label htmlFor="mobile-number">Mobile Number</label>
      <input
        id="mobile-number"
        type="tel"
        value={mobileNumber}
        onChange={(e) => setMobileNumber(e.target.value)}
        autoComplete="tel"
        placeholder="e.g. +27821234567"
      />

      <label htmlFor="user-role">Role</label>
      <select
        id="user-role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="PATRON">Patron (Customer)</option>
        <option value="STAFF">Staff</option>
        <option value="MANAGER">Manager</option>
      </select>

      <label htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <label htmlFor="confirm">Confirm password</label>
      <input
        id="confirm"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <p className="switch">
        Already have an account?{" "}
        <button type="button" className="link" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}
